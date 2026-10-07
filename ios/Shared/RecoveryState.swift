import Foundation

struct RecoveryState {
    let required: TimeInterval
    let worked: TimeInterval
    let active: Bool
    let date: Date
    var remaining: TimeInterval { max(0, required - worked) }
    var fraction: Double { required > 0 ? min(1, worked / required) : 1 }
    var status: String { remaining <= 0 ? "Covered!" : active ? "Working now" : "Paused" }
    var countdownEnd: Date { date.addingTimeInterval(remaining) }

    static func intervals(work: WorkSnapshot, at date: Date) -> [DateInterval] {
        let month = MonthClock(at: date)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = ExpenseSnapshot.zone
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        formatter.isLenient = false
        var spans: [DateInterval] = []
        for day in work.days {
            for job in day.jobs where job.status == "scheduled" {
                guard let start = formatter.date(from: "\(day.date) \(job.checkIn)"),
                      var end = formatter.date(from: "\(day.date) \(job.checkOut)") else { continue }
                if end < start { end = calendar.date(byAdding: .day, value: 1, to: end)! }
                let duration = end.timeIntervalSince(start)
                // Break timing is not stored. Reserve the final 30 minutes for qualifying shifts.
                if duration >= 5.5 * 3600 { end = end.addingTimeInterval(-1800) }
                let clippedStart = max(start, month.start)
                let clippedEnd = min(end, month.end)
                if clippedEnd > clippedStart { spans.append(DateInterval(start: clippedStart, end: clippedEnd)) }
            }
        }
        // Overlapping schedules cannot credit the same real second twice.
        var merged: [DateInterval] = []
        for span in spans.sorted(by: { $0.start < $1.start }) {
            if let last = merged.last, span.start <= last.end {
                merged[merged.count - 1] = DateInterval(start: last.start, end: max(last.end, span.end))
            } else { merged.append(span) }
        }
        return merged
    }
    static func make(expenses: ExpenseSnapshot?, work: WorkSnapshot?, at date: Date) -> Self? {
        guard let expenses, expenses.matches(date), let work,
              let income = expenses.income, income.isFinite,
              work.isSample == expenses.isSample,
              work.isSample || (work.includesMonthHistory == true && work.day(at: MonthClock(at: date).start) != nil) else { return nil }
        let spans = intervals(work: work, at: date)
        let worked = spans.reduce(0.0) { $0 + max(0, min(date, $1.end).timeIntervalSince($1.start)) }
        return Self(required: max(0, expenses.total - income) / 15 * 3600, worked: worked,
                    active: spans.contains { $0.start <= date && date < $0.end }, date: date)
    }
    static func displayDuration(_ seconds: TimeInterval) -> String {
        let value = Int(min(999_999_999, max(0, ceil(seconds))))
        return String(format: "%d:%02d:%02d", value / 3600, value % 3600 / 60, value % 60)
    }
    static func timelineDates(expenses: ExpenseSnapshot?, work: WorkSnapshot?, from now: Date) -> [Date] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = ExpenseSnapshot.zone
        let horizon = calendar.date(byAdding: .day, value: 7, to: calendar.startOfDay(for: now))!
        var dates: Set<Date> = [now, MonthClock(at: now).end]
        for offset in 1...7 {
            dates.insert(calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now))!)
        }
        if let work {
            for span in intervals(work: work, at: now) where span.end > now && span.start < horizon {
                dates.insert(max(now, span.start))
                dates.insert(span.end)
                // Cached entries update the ring and pause state without per-second network requests.
                var tick = max(now, span.start).addingTimeInterval(15 * 60)
                while tick < min(span.end, horizon) { dates.insert(tick); tick = tick.addingTimeInterval(15 * 60) }
                if let state = make(expenses: expenses, work: work, at: max(now, span.start)),
                   state.remaining > 0, state.countdownEnd <= span.end { dates.insert(state.countdownEnd) }
            }
        }
        return dates.sorted()
    }
}
