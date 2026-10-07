import XCTest
@testable import WorkToday

final class RecoveryTests: XCTestCase {
    private func date(_ value: String) -> Date { ISO8601DateFormatter().date(from: value)! }
    private func work(_ days: [WorkDay]) -> WorkSnapshot {
        WorkSnapshot(version: 1, isSample: true, generatedAt: "", timeZone: "America/Edmonton", days: days)
    }
    private func job(_ start: String, _ end: String, id: String = "iron") -> JobDay {
        JobDay(id: id, name: "Long workplace name for scheduled work", checkIn: start, checkOut: end, hours: 0, amount: 0, status: "scheduled")
    }
    private func expenses(_ now: Date, total: Double = 150) -> ExpenseSnapshot {
        ExpenseSnapshot(month: ExpenseSnapshot.monthKey(now), total: total, count: 1, updatedAt: now, isSample: true, income: 0)
    }
    func testTimerTicksOnlyDuringWorkAndExcludesFuture() throws {
        let now = date("2026-10-06T16:00:00Z") // 10 AM Edmonton
        let w = work([WorkDay(date: "2026-10-06", jobs: [job("09:00", "17:00")]),
                      WorkDay(date: "2026-10-07", jobs: [job("09:00", "17:00")])])
        let state = try XCTUnwrap(RecoveryState.make(expenses: expenses(now), work: w, at: now))
        XCTAssertEqual(state.worked, 3600)
        XCTAssertEqual(state.remaining, 9 * 3600)
        XCTAssertTrue(state.active)
        let later = try XCTUnwrap(RecoveryState.make(expenses: expenses(now), work: w, at: now.addingTimeInterval(1)))
        XCTAssertEqual(later.remaining, state.remaining - 1)
        XCTAssertEqual(later.countdownEnd, state.countdownEnd)
        let before = date("2026-10-06T14:00:00Z")
        XCTAssertEqual(RecoveryState.make(expenses: expenses(now), work: w, at: before)?.worked, 0)
    }
    func testLedgerIncomeThenSubtractWorkedTime() throws {
        let now = date("2026-10-06T16:00:00Z")
        let w = work([WorkDay(date: "2026-10-06", jobs: [job("09:00", "17:00")])])
        var e = expenses(now, total: 300)
        e.income = 150
        let state = try XCTUnwrap(RecoveryState.make(expenses: e, work: w, at: now))
        XCTAssertEqual(state.required, 10 * 3600)
        XCTAssertEqual(state.worked, 3600)
        XCTAssertEqual(state.remaining, 9 * 3600)
        e.income = 0
        e = ExpenseSnapshot(month: e.month, total: 1505.32, count: 1, updatedAt: now, isSample: true, income: 0)
        XCTAssertEqual(try XCTUnwrap(RecoveryState.make(expenses: e, work: w, at: now)).required,
                       1505.32 / 15 * 3600, accuracy: 0.001)
        e.income = 2000
        XCTAssertEqual(RecoveryState.make(expenses: e, work: w, at: now)?.remaining, 0)
        e.income = nil
        XCTAssertNil(RecoveryState.make(expenses: e, work: w, at: now))
    }
    func testOldPayrollCacheIsIgnored() throws {
        let now = date("2026-10-06T16:00:00Z")
        let cached = """
        {"month":"2026-10","total":1505.32,"count":22,"updatedAt":0,"isSample":true,"income":0,
         "payouts":[{"date":"2026-10-01","amount":1183.57}]}
        """
        let e = try JSONDecoder().decode(ExpenseSnapshot.self, from: Data(cached.utf8))
        let state = try XCTUnwrap(RecoveryState.make(expenses: e, work: work([]), at: now))
        XCTAssertEqual(state.remaining, 1505.32 / 15 * 3600, accuracy: 0.001)
    }
    func testBreakAtEndAndNoDoubleCreditForOverlap() throws {
        let now = date("2026-10-06T22:45:00Z") // 16:45, reserved break
        let w = work([WorkDay(date: "2026-10-06", jobs: [job("09:00", "17:00"), job("10:00", "12:00", id: "booster")])])
        let state = try XCTUnwrap(RecoveryState.make(expenses: expenses(now), work: w, at: now))
        XCTAssertEqual(state.worked, 7.5 * 3600)
        XCTAssertFalse(state.active)
        XCTAssertEqual(RecoveryState.make(expenses: expenses(now), work: w, at: now.addingTimeInterval(60))?.remaining, state.remaining)
    }
    func testOvernightClippedToMonthAndZeroFloor() throws {
        let now = date("2026-10-01T08:00:00Z")
        let w = work([WorkDay(date: "2026-09-30", jobs: [job("22:00", "02:00")])])
        let state = try XCTUnwrap(RecoveryState.make(expenses: expenses(now, total: 15), work: w, at: now))
        XCTAssertEqual(state.worked, 2 * 3600)
        XCTAssertEqual(state.remaining, 0)
        XCTAssertEqual(state.fraction, 1)
        XCTAssertEqual(state.status, "Covered!")
    }
    func testMissingHistoryAndStaleMonthRequireSync() {
        let now = date("2026-10-06T16:00:00Z")
        var w = work([])
        let real = ExpenseSnapshot(month: "2026-10", total: 15, count: 1, updatedAt: now, income: 0)
        w = WorkSnapshot(version: 1, isSample: false, generatedAt: "", timeZone: "America/Edmonton", days: [])
        XCTAssertNil(RecoveryState.make(expenses: real, work: w, at: now))
        XCTAssertNil(RecoveryState.make(expenses: expenses(now), work: work([]), at: date("2026-11-01T18:00:00Z")))
    }
    func testTimelineIncludesPauseAndCompletion() {
        let now = date("2026-10-06T14:00:00Z")
        let w = work([WorkDay(date: "2026-10-06", jobs: [job("09:00", "17:00")])])
        let dates = RecoveryState.timelineDates(expenses: expenses(now, total: 15), work: w, from: now)
        XCTAssertTrue(dates.contains(date("2026-10-06T15:00:00Z")))
        XCTAssertTrue(dates.contains(date("2026-10-06T16:00:00Z")))
        XCTAssertTrue(dates.contains(date("2026-10-06T22:30:00Z")))
        XCTAssertEqual(dates, Array(Set(dates)).sorted())
        XCTAssertEqual(RecoveryState.displayDuration(3661), "1:01:01")
    }
    func testAdviceRotatesDailyAndHas24UniqueTips() {
        XCTAssertEqual(MoneyAdvice.tips.count, 24)
        XCTAssertEqual(Set(MoneyAdvice.tips.map(\.text)).count, 24)
        XCTAssertTrue(MoneyAdvice.tips.allSatisfy { !$0.emoji.isEmpty && !$0.asset.isEmpty })
        let now = date("2026-10-06T18:00:00Z")
        XCTAssertEqual(MoneyAdvice.tip(at: now).text, MoneyAdvice.tip(at: now.addingTimeInterval(60)).text)
        XCTAssertNotEqual(MoneyAdvice.tip(at: now).text, MoneyAdvice.tip(at: now.addingTimeInterval(86400)).text)
    }
}
