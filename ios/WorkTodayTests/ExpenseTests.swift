import XCTest
@testable import WorkToday

final class ExpenseTests: XCTestCase {
    func testMidnightRefreshAcrossDSTAndYearBoundary() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Edmonton")!
        let parser = ISO8601DateFormatter()
        for (input, expected) in [
            ("2026-10-06T18:00:00Z", "2026-10-07T06:00:00Z"),
            ("2026-03-08T07:00:00Z", "2026-03-09T06:00:00Z"),
            ("2024-11-03T06:00:00Z", "2024-11-04T07:00:00Z"),
            ("2024-12-31T20:00:00Z", "2025-01-01T07:00:00Z")
        ] {
            XCTAssertEqual(ScheduleRefresh.nextMidnight(after: parser.date(from: input)!, calendar: calendar), parser.date(from: expected)!)
        }
    }
    func testMonthlyExpensesAndSharedAmounts() {
        let now = ISO8601DateFormatter().date(from: "2026-10-05T18:00:00Z")!
        let snapshot = ExpenseSnapshot.make(entries: [
            ExpenseRecord(date: "2026-10-01", amount: 10, isIncome: false, shared: false),
            ExpenseRecord(date: "2026-10-05", amount: 25, isIncome: false, shared: true),
            ExpenseRecord(date: "2026-10-02", amount: 500, isIncome: true, shared: false),
            ExpenseRecord(date: "2026-09-30", amount: 100, isIncome: false, shared: false)
        ], now: now)
        XCTAssertEqual(snapshot.total, 22.5)
        XCTAssertEqual(snapshot.count, 2)
        XCTAssertEqual(snapshot.income, 500)
        XCTAssertEqual(snapshot.isOverspending, false)
        XCTAssertEqual(snapshot.recoveryHours, 1.5)
        XCTAssertFalse(snapshot.matches(ISO8601DateFormatter().date(from: "2026-11-01T18:00:00Z")!))
        XCTAssertEqual(ExpenseSnapshot.make(entries: [], now: now).total, 0)
    }
    func testMoneyMoodAndRecovery() throws {
        let now = Date()
        let date = WorkSnapshot.key(now, zone: ExpenseSnapshot.zone)
        func snapshot(_ income: Double) -> ExpenseSnapshot {
            ExpenseSnapshot.make(entries: [ExpenseRecord(date: date, amount: 180, isIncome: false, shared: false),
                ExpenseRecord(date: date, amount: income, isIncome: true, shared: false)], now: now)
        }
        XCTAssertEqual(snapshot(30).recoveryHours, 12)
        XCTAssertEqual(snapshot(30).isOverspending, true)
        XCTAssertEqual(snapshot(180).isOverspending, false)
        XCTAssertEqual(snapshot(200).shortfall, 0)
        let empty = ExpenseSnapshot.make(entries: [], now: now)
        XCTAssertEqual(empty.income, 0)
        XCTAssertEqual(empty.isOverspending, false)
        // A pre-upgrade cache must ask for sync instead of inventing zero income.
        let old = ExpenseSnapshot(month: ExpenseSnapshot.monthKey(now), total: 180, count: 1, updatedAt: now)
        let decoded = try JSONDecoder().decode(ExpenseSnapshot.self, from: JSONEncoder().encode(old))
        XCTAssertNil(decoded.income)
        XCTAssertEqual(decoded.recoveryHours, 12)
    }
    func testMonthUsesEdmontonTime() {
        let instant = ISO8601DateFormatter().date(from: "2026-11-01T01:00:00Z")!
        XCTAssertEqual(ExpenseSnapshot.monthKey(instant), "2026-10")
    }
    func testTomorrowSampleAndTimeFormatting() {
        let sample = WorkSnapshot.sample()
        let tomorrow = sample.calendar.date(byAdding: .day, value: 1, to: .now)!
        XCTAssertEqual(sample.day(at: tomorrow)?.jobs.count, 2)
        XCTAssertEqual(JobDay.displayTime("00:00"), "12:00 AM")
        XCTAssertEqual(JobDay.displayTime("14:15"), "2:15 PM")
    }
}
