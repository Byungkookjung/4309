import Foundation

enum ScheduleRefresh {
    static func nextMidnight(after date: Date, calendar: Calendar) -> Date {
        // Calendar arithmetic preserves local midnight across daylight-saving changes.
        calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: date))!
    }
}

struct JobDay: Codable, Identifiable {
    let id: String
    let name: String
    let checkIn: String
    let checkOut: String
    let hours: Double
    let amount: Double
    let status: String

    var timeLabel: String {
        switch status {
        case "off": return "No shift today"
        case "incomplete": return "Complete shift times"
        default: return "\(Self.displayTime(checkIn)) - \(Self.displayTime(checkOut))"
        }
    }
    static func displayTime(_ time: String) -> String {
        let parts = time.split(separator: ":")
        guard parts.count == 2, let hour = Int(parts[0]), let minute = Int(parts[1]),
              (0...23).contains(hour), (0...59).contains(minute) else { return time }
        return "\(hour % 12 == 0 ? 12 : hour % 12):\(String(format: "%02d", minute)) \(hour < 12 ? "AM" : "PM")"
    }
}

struct WorkDay: Codable {
    let date: String
    let jobs: [JobDay]
}

struct WorkSnapshot: Codable {
    let version: Int
    let isSample: Bool
    let generatedAt: String
    let timeZone: String
    let days: [WorkDay]
    var includesMonthHistory: Bool? = nil

    var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timeZone) ?? .current
        return calendar
    }

    func day(at date: Date) -> WorkDay? {
        days.first { $0.date == Self.key(date, zone: calendar.timeZone) }
    }

    static func key(_ date: Date, zone: TimeZone = .current) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = zone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    static func decode(_ data: Data) throws -> WorkSnapshot {
        guard data.count <= 2_000_000 else { throw SnapshotError.invalid }
        let snapshot = try JSONDecoder().decode(Self.self, from: data)
        guard snapshot.version == 1, TimeZone(identifier: snapshot.timeZone) != nil,
              !snapshot.days.isEmpty, snapshot.days.count <= 366,
              Set(snapshot.days.map(\.date)).count == snapshot.days.count,
              snapshot.days.allSatisfy({ day in
                  day.date.range(of: "^\\d{4}-\\d{2}-\\d{2}$", options: .regularExpression) != nil &&
                  Set(day.jobs.map(\.id)) == Set(["booster", "iron"]) && day.jobs.count == 2 &&
                  day.jobs.allSatisfy { job in
                      job.name.count <= 200 && !job.name.isEmpty &&
                      job.amount.isFinite && job.amount >= 0 && job.amount <= 1_000_000 &&
                      job.hours.isFinite && job.hours >= 0 && job.hours <= 24 &&
                      ["off", "incomplete", "scheduled"].contains(job.status) &&
                      [job.checkIn, job.checkOut].allSatisfy { time in
                          time.isEmpty || time.range(of: "^([01]\\d|2[0-3]):[0-5]\\d$", options: .regularExpression) != nil
                      }
                  }
              }) else { throw SnapshotError.invalid }
        return snapshot
    }

    static func sample(now: Date = .now) -> WorkSnapshot {
        WorkSnapshot(version: 1, isSample: true,
                     generatedAt: ISO8601DateFormatter().string(from: now),
                     timeZone: TimeZone.current.identifier,
                     days: (0...1).map { offset in WorkDay(date: key(Calendar.current.date(byAdding: .day, value: offset, to: now)!), jobs: [
                        JobDay(id: "booster", name: "Booster Juice", checkIn: "14:15", checkOut: "21:15", hours: 6.5, amount: 97.5, status: "scheduled"),
                        JobDay(id: "iron", name: "Iron Peak Auto Repair", checkIn: "08:00", checkOut: "13:00", hours: 5, amount: 100, status: "scheduled")
                     ]) })
    }
}

enum SnapshotError: LocalizedError {
    case invalid, unavailable
    var errorDescription: String? {
        switch self {
        case .invalid: return "This is not valid Work Today data. Export a new file from the work sheet."
        case .unavailable: return "Shared storage is unavailable. Configure the same App Group for the app and widget in Xcode."
        }
    }
}

enum SnapshotStore {
    static var fileURL: URL? {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "WorkAppGroup") as? String else { return nil }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?
            .appendingPathComponent("work-today.json")
    }
    static func load() -> WorkSnapshot? {
        guard let url = fileURL, let data = try? Data(contentsOf: url) else { return nil }
        return try? WorkSnapshot.decode(data)
    }
    static func save(_ snapshot: WorkSnapshot) throws {
        guard let url = fileURL else { throw SnapshotError.unavailable }
        try JSONEncoder().encode(snapshot).write(to: url, options: .atomic)
    }
    static func clear() throws {
        guard let url = fileURL else { throw SnapshotError.unavailable }
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}
