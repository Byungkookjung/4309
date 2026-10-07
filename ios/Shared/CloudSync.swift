import Foundation
import Security

struct CloudCredentials: Codable {
    let uid: String
    var refreshToken: String
    var connectionID: String?
}

enum CloudError: LocalizedError {
    case connection, signedOut, network, data, storage
    var errorDescription: String? {
        switch self {
        case .connection: return "Connection did not finish. Please try again."
        case .signedOut: return "Please reconnect your Google account."
        case .network: return "Could not sync. Check your connection and try again."
        case .data: return "The saved data could not be read."
        case .storage: return "Secure shared storage is unavailable. Check app signing."
        }
    }
}

enum CredentialStore {
    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "WorkTodayCloud", kSecAttrAccount as String: "firebase",
         kSecAttrAccessGroup as String: Bundle.main.object(forInfoDictionaryKey: "WorkAppGroup") as? String ?? ""]
    }
    static func load() -> CloudCredentials? {
        var query = query
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(CloudCredentials.self, from: data)
    }
    static func save(_ credentials: CloudCredentials) throws {
        let data = try JSONEncoder().encode(credentials)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var attributes = query
            attributes[kSecValueData as String] = data
            attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            guard SecItemAdd(attributes as CFDictionary, nil) == errSecSuccess else { throw CloudError.storage }
        } else if status != errSecSuccess { throw CloudError.storage }
    }
    static func clear() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw CloudError.storage }
    }
}

private struct FireValue: Decodable {
    var stringValue: String?
    var integerValue: String?
    var doubleValue: Double?
    var booleanValue: Bool?
    var number: Double? { doubleValue ?? integerValue.flatMap(Double.init) }
}
private struct FireDocument: Decodable { let fields: [String: FireValue]? }
private struct FirePage: Decodable { let documents: [FireDocument]?; let nextPageToken: String? }
private struct TokenResponse: Decodable { let id_token: String; let refresh_token: String; let user_id: String }

actor CloudSync {
    static let shared = CloudSync()
    private let session: URLSession
    init(session: URLSession = .shared) { self.session = session }
    private let apiKey = "AIzaSyC4i32hyIRXhib_keTTr9zSj3AOolasYLc"
    private let base = "https://firestore.googleapis.com/v1/projects/todo-ledger/databases/(default)/documents/users/"

    private func request(_ request: URLRequest, allowMissing: Bool = false) async throws -> Data? {
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw CloudError.network }
        if allowMissing && response.statusCode == 404 { return nil }
        if response.statusCode == 401 || response.statusCode == 403 ||
            (response.statusCode == 400 && request.url?.host == "securetoken.googleapis.com") { throw CloudError.signedOut }
        guard (200...299).contains(response.statusCode) else { throw CloudError.network }
        return data
    }
    private func get(_ path: String, token: String, missing: Bool = false) async throws -> Data? {
        guard let url = URL(string: path) else { throw CloudError.data }
        var call = URLRequest(url: url, timeoutInterval: 15)
        call.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await request(call, allowMissing: missing)
    }
    private func authorize() async throws -> (String, String, String?) {
        guard var credentials = CredentialStore.load() else { throw CloudError.signedOut }
        let connectionID = credentials.connectionID
        var call = URLRequest(url: URL(string: "https://securetoken.googleapis.com/v1/token?key=\(apiKey)")!, timeoutInterval: 15)
        call.httpMethod = "POST"
        call.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var body = URLComponents()
        body.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token"), URLQueryItem(name: "refresh_token", value: credentials.refreshToken)]
        call.httpBody = body.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B").data(using: .utf8)
        guard let tokenData = try await request(call) else { throw CloudError.network }
        let token = try JSONDecoder().decode(TokenResponse.self, from: tokenData)
        guard token.user_id == credentials.uid else { throw CloudError.signedOut }
        guard CredentialStore.load()?.connectionID == connectionID else { throw CloudError.signedOut }
        credentials.refreshToken = token.refresh_token
        try CredentialStore.save(credentials)
        let uid = credentials.uid.addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
        return (uid, token.id_token, connectionID)
    }
    func syncExpenses(now: Date = .now) async throws -> ExpenseSnapshot {
        let (uid, token, connectionID) = try await authorize()
        var entries: [ExpenseRecord] = []
        var pageToken: String?
        var seen = Set<String>()
        repeat {
            var url = URLComponents(string: base + uid + "/ledgerEntries")!
            url.queryItems = [URLQueryItem(name: "pageSize", value: "1000")]
            if let pageToken { url.queryItems?.append(URLQueryItem(name: "pageToken", value: pageToken)) }
            guard let data = try await get(url.url!.absoluteString, token: token) else { throw CloudError.data }
            let page = try JSONDecoder().decode(FirePage.self, from: data)
            for document in page.documents ?? [] {
                let f = document.fields ?? [:]
                guard let date = f["date"]?.stringValue,
                      let amount = f["amount"]?.number, amount.isFinite, amount > 0,
                      let reason = f["reason"]?.stringValue, !reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { continue }
                entries.append(ExpenseRecord(date: date, amount: amount,
                    isIncome: f["type"]?.stringValue == "income", shared: f["isShared"]?.booleanValue == true))
            }
            pageToken = page.nextPageToken
            if let pageToken, !seen.insert(pageToken).inserted { throw CloudError.data }
            guard entries.count <= 100_000 else { throw CloudError.data }
        } while pageToken != nil
        let snapshot = ExpenseSnapshot.make(entries: entries, now: now)
        guard CredentialStore.load()?.connectionID == connectionID else { throw CloudError.signedOut }
        try ExpenseStore.save(snapshot)
        return snapshot
    }
    func sync() async throws -> WorkSnapshot {
        let (uid, idToken, connectionID) = try await authorize()
        var allJobs: [[String: JobDay]] = []
        let now = Date()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Edmonton")!
        let pastDays = calendar.component(.day, from: now)
        // Include the prior month's final day for shifts crossing into this month.
        let dates = (-pastDays...30).map { WorkSnapshot.key(calendar.date(byAdding: .day, value: $0, to: now)!, zone: calendar.timeZone) }
        for (id, name, suffix) in [("booster", "Booster Juice", ""), ("iron", "Iron Peak Auto Repair", "IronPeak")] {
            let settingsData = try await get(base + uid + "/weeklyWorkMeta/settings" + suffix, token: idToken, missing: true)
            let fields = try settingsData.map { try JSONDecoder().decode(FireDocument.self, from: $0).fields ?? [:] } ?? [:]
            let rate = fields["hourlyRate"]?.number ?? 15
            let holiday = fields["holidayMultiplier"]?.number ?? 1.5
            guard rate.isFinite, rate >= 0, holiday.isFinite, holiday >= 1 else { throw CloudError.data }
            var documents: [FireDocument] = []
            var pageToken: String?
            repeat {
                var url = URLComponents(string: base + uid + "/weeklyWorkShifts" + suffix)!
                url.queryItems = [URLQueryItem(name: "pageSize", value: "1000")]
                if let pageToken { url.queryItems?.append(URLQueryItem(name: "pageToken", value: pageToken)) }
                guard let data = try await get(url.url!.absoluteString, token: idToken) else { throw CloudError.data }
                let page = try JSONDecoder().decode(FirePage.self, from: data)
                documents += page.documents ?? []; pageToken = page.nextPageToken
                guard documents.count <= 100_000 else { throw CloudError.data }
            } while pageToken != nil
            var rows: [String: JobDay] = [:]
            for document in documents {
                let fields = document.fields ?? [:]
                guard let date = fields["date"]?.stringValue, dates.contains(date) else { continue }
                rows[date] = ShiftEstimate.make(id: id, name: name,
                    checkIn: fields["checkIn"]?.stringValue ?? "", checkOut: fields["checkOut"]?.stringValue ?? "",
                    rate: rate, multiplier: fields["isHoliday"]?.booleanValue == true ? holiday : 1)
            }
            allJobs.append(Dictionary(uniqueKeysWithValues: dates.map { date in
                (date, rows[date] ?? JobDay(id: id, name: name, checkIn: "", checkOut: "", hours: 0, amount: 0, status: "off"))
            }))
        }
        let snapshot = WorkSnapshot(version: 1, isSample: false, generatedAt: ISO8601DateFormatter().string(from: now), timeZone: calendar.timeZone.identifier,
                                    days: dates.map { date in WorkDay(date: date, jobs: allJobs.compactMap { $0[date] }) }, includesMonthHistory: true)
        guard CredentialStore.load()?.connectionID == connectionID else { throw CloudError.signedOut }
        try SnapshotStore.save(snapshot)
        return snapshot
    }
}

enum ShiftEstimate {
    static func make(id: String, name: String, checkIn: String, checkOut: String, rate: Double, multiplier: Double) -> JobDay {
        func minutes(_ time: String) -> Int? {
            guard time.range(of: "^([01]\\d|2[0-3]):[0-5]\\d$", options: .regularExpression) != nil else { return nil }
            let parts = time.split(separator: ":").compactMap { Int($0) }
            return parts[0] * 60 + parts[1]
        }
        var status = checkIn.isEmpty && checkOut.isEmpty ? "off" : "incomplete"
        var hours = 0.0
        if let start = minutes(checkIn), let end = minutes(checkOut) {
            let duration = (Double((end - start + 1440) % 1440) / 60 * 100).rounded() / 100
            hours = max(0, duration - (duration >= 5.5 ? 0.5 : 0)); status = "scheduled"
        }
        return JobDay(id: id, name: name, checkIn: checkIn, checkOut: checkOut, hours: hours,
                      amount: (hours * rate * multiplier * 100).rounded() / 100, status: status)
    }
}
