import XCTest
@testable import WorkToday

private final class StubCloudProtocol: URLProtocol {
    static var fail = false
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        if Self.fail { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)); return }
        let path = request.url!.path
        let value: [String: Any]
        if path.contains("/token") {
            value = ["id_token": "test-id-token", "refresh_token": "test-refresh-token", "user_id": "test-only"]
        } else if path.contains("weeklyWorkMeta") {
            value = ["fields": ["hourlyRate": ["doubleValue": path.hasSuffix("IronPeak") ? 20 : 15], "holidayMultiplier": ["doubleValue": 1.5]]]
        } else if path.contains("weeklyWorkPayouts") {
            XCTFail("Ledger sync must not fetch Payout History")
            value = [:]
        } else if path.contains("ledgerEntries") {
            let date = WorkSnapshot.key(.now, zone: ExpenseSnapshot.zone)
            value = ["documents": [["fields": ["date": ["stringValue": date], "reason": ["stringValue": "Groceries"], "type": ["stringValue": "expense"], "amount": ["doubleValue": 40], "isShared": ["booleanValue": true]]]]]
        } else {
            let date = WorkSnapshot.key(.now, zone: TimeZone(identifier: "America/Edmonton")!)
            value = ["documents": [["fields": ["date": ["stringValue": date], "checkIn": ["stringValue": "14:15"], "checkOut": ["stringValue": "21:15"], "isHoliday": ["booleanValue": path.hasSuffix("IronPeak")]]]]]
        }
        let data = try! JSONSerialization.data(withJSONObject: value)
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class CloudSyncTests: XCTestCase {
    func testBothJobsSyncAndOfflinePreservesCache() async throws {
        guard CredentialStore.load() == nil else { throw XCTSkip("Keep existing account untouched") }
        let previous = SnapshotStore.load()
        let previousExpenses = ExpenseStore.load()
        defer {
            try? CredentialStore.clear()
            if let previous { try? SnapshotStore.save(previous) } else { try? SnapshotStore.clear() }
            if let previousExpenses { try? ExpenseStore.save(previousExpenses) } else { try? ExpenseStore.clear() }
            StubCloudProtocol.fail = false
        }
        try CredentialStore.save(CloudCredentials(uid: "test-only", refreshToken: "fake", connectionID: UUID().uuidString))
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubCloudProtocol.self]
        let sync = CloudSync(session: URLSession(configuration: config))
        let snapshot = try await sync.sync()
        XCTAssertEqual(snapshot.day(at: .now)?.jobs[0].amount, 97.5)
        XCTAssertEqual(snapshot.day(at: .now)?.jobs[1].amount, 195)
        XCTAssertGreaterThanOrEqual(snapshot.days.count, 32)
        XCTAssertEqual(snapshot.includesMonthHistory, true)
        XCTAssertFalse(snapshot.isSample)
        let expenses = try await sync.syncExpenses()
        XCTAssertEqual(expenses.total, 20)
        XCTAssertEqual(expenses.count, 1)
        XCTAssertEqual(expenses.income, 0)
        StubCloudProtocol.fail = true
        do { _ = try await sync.sync(); XCTFail("Offline request should fail") } catch { }
        XCTAssertEqual(SnapshotStore.load()?.generatedAt, snapshot.generatedAt)
        do { _ = try await sync.syncExpenses(); XCTFail("Offline ledger should fail") } catch { }
        XCTAssertEqual(ExpenseStore.load()?.total, 20)
    }
}
