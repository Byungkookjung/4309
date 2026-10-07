import Foundation
import SwiftUI

struct ExpenseRecord {
    let date: String
    let amount: Double
    let isIncome: Bool
    let shared: Bool
}

struct ExpenseSnapshot: Codable {
    let month: String
    let total: Double
    let count: Int
    let updatedAt: Date
    var isSample = false
    // Old caches have no income; nil means sync needed, not zero income.
    var income: Double? = nil
    var shortfall: Double? { income.map { max(0, total - $0) } }
    var recoveryHours: Double { total / 15 }
    var isOverspending: Bool? { income.map { total > $0 } }
    static let zone = TimeZone(identifier: "America/Edmonton")!
    static func monthKey(_ date: Date) -> String { String(WorkSnapshot.key(date, zone: zone).prefix(7)) }
    func matches(_ date: Date) -> Bool { month == Self.monthKey(date) }
    static func make(entries: [ExpenseRecord], now: Date) -> Self {
        let month = monthKey(now)
        let monthly = entries.filter {
            $0.amount.isFinite && $0.amount > 0 &&
            $0.date.hasPrefix(month + "-") && $0.date.count == 10
        }
        let expenses = monthly.filter { !$0.isIncome }
        let total = expenses.reduce(0.0) { sum, item in
            sum + (item.amount / (item.shared ? 2 : 1) * 100).rounded() / 100
        }
        let income = monthly.filter(\.isIncome).reduce(0.0) { $0 + ($1.amount * 100).rounded() / 100 }
        return Self(month: month, total: (total * 100).rounded() / 100, count: expenses.count, updatedAt: now, income: (income * 100).rounded() / 100)
    }
    static func sample(now: Date = .now) -> Self {
        Self(month: monthKey(now), total: 1234.56, count: 24, updatedAt: now, isSample: true, income: 1000)
    }
}

enum ExpenseStore {
    static var fileURL: URL? { SnapshotStore.fileURL?.deletingLastPathComponent().appendingPathComponent("monthly-expenses.json") }
    static func load() -> ExpenseSnapshot? {
        guard let url = fileURL, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(ExpenseSnapshot.self, from: data)
    }
    static func save(_ snapshot: ExpenseSnapshot) throws {
        guard let url = fileURL else { throw SnapshotError.unavailable }
        try JSONEncoder().encode(snapshot).write(to: url, options: .atomic)
    }
    static func clear() throws {
        guard let url = fileURL else { throw SnapshotError.unavailable }
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}
