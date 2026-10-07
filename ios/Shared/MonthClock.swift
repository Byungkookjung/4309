import Foundation

struct MonthClock {
    let start: Date
    let end: Date
    init(at date: Date) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = ExpenseSnapshot.zone
        let interval = calendar.dateInterval(of: .month, for: date)!
        start = interval.start
        end = interval.end
    }
    var interval: ClosedRange<Date> { start...end }
    func fraction(at date: Date) -> Double {
        min(1, max(0, date.timeIntervalSince(start) / end.timeIntervalSince(start)))
    }
    func secondsRemaining(at date: Date) -> Int {
        max(0, Int(ceil(end.timeIntervalSince(date))))
    }
}
