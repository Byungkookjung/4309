import SwiftUI
import WidgetKit

struct WorkEntry: TimelineEntry {
    let date: Date
    let snapshot: WorkSnapshot?
}

struct WorkProvider: TimelineProvider {
    func placeholder(in context: Context) -> WorkEntry { WorkEntry(date: .now, snapshot: .sample()) }
    func getSnapshot(in context: Context, completion: @escaping (WorkEntry) -> Void) {
        completion(WorkEntry(date: .now, snapshot: context.isPreview ? .sample() : SnapshotStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkEntry>) -> Void) {
        Task {
            if CredentialStore.load() != nil { _ = try? await CloudSync.shared.sync() }
        let snapshot = SnapshotStore.load()
        let now = Date()
        var fallbackCalendar = Calendar(identifier: .gregorian)
        fallbackCalendar.timeZone = TimeZone(identifier: "America/Edmonton")!
        let calendar = snapshot?.calendar ?? fallbackCalendar
        let midnight = calendar.startOfDay(for: now)
        var entries = [WorkEntry(date: now, snapshot: snapshot)]
        // Precompute day changes so yesterday's shift never remains labeled "today".
        for offset in 1...7 {
            if let date = calendar.date(byAdding: .day, value: offset, to: midnight) {
                entries.append(WorkEntry(date: date, snapshot: snapshot))
            }
        }
        completion(Timeline(entries: entries, policy: .after(ScheduleRefresh.nextMidnight(after: now, calendar: calendar))))
        }
    }
}

struct WorkTodayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "WorkTodayWidget", provider: WorkProvider()) { entry in
            WorkWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Both Jobs Today")
        .description("Both jobs' shifts and estimated pay. Large includes tomorrow.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct WorkWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WorkEntry
    var body: some View {
        TodayWidgetView(snapshot: entry.snapshot, date: entry.date, family: family)
            .padding(family == .systemSmall ? 10 : 16)
            .containerBackground(WidgetStyle.background, for: .widget)
            .widgetURL(URL(string: "worktoday://today"))
    }
}

struct ExpenseEntry: TimelineEntry {
    let date: Date
    let snapshot: ExpenseSnapshot?
}
struct ExpenseProvider: TimelineProvider {
    func placeholder(in context: Context) -> ExpenseEntry { ExpenseEntry(date: .now, snapshot: .sample()) }
    func getSnapshot(in context: Context, completion: @escaping (ExpenseEntry) -> Void) {
        completion(ExpenseEntry(date: .now, snapshot: context.isPreview ? .sample() : ExpenseStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ExpenseEntry>) -> Void) {
        Task {
            if CredentialStore.load() != nil { _ = try? await CloudSync.shared.syncExpenses() }
            let now = Date()
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = ExpenseSnapshot.zone
            let nextMonth = calendar.dateInterval(of: .month, for: now)!.end
            let snapshot = ExpenseStore.load()
            completion(Timeline(entries: [ExpenseEntry(date: now, snapshot: snapshot),
                ExpenseEntry(date: nextMonth, snapshot: nil)], policy: .after(ScheduleRefresh.nextMidnight(after: now, calendar: calendar))))
        }
    }
}
struct MonthlyExpenseWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MonthlyExpenseWidget", provider: ExpenseProvider()) { entry in
            MoneyEntryView(entry: entry, recovery: false)
        }
        .configurationDisplayName("Monthly Money")
        .description("This month's spending, income and a little money mood.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

struct MoneyEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ExpenseEntry
    let recovery: Bool
    var body: some View {
        Group {
            if recovery { RecoveryWidgetView(snapshot: entry.snapshot, date: entry.date, family: family) }
            else { MonthlyExpenseView(snapshot: entry.snapshot, date: entry.date, family: family) }
        }.padding(family == .systemSmall ? 10 : 16)
            .containerBackground(WidgetStyle.background, for: .widget)
            .widgetURL(URL(string: "worktoday://expenses"))
    }
}

struct RecoveryWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RecoveryWidget", provider: RecoveryProvider()) { entry in
            RecoveryEntryView(entry: entry)
        }
        .configurationDisplayName("Earn It Back")
        .description("(Monthly spending - ledger income) / $15 minus elapsed scheduled work. Counts down during work; breaks reserved at shift end.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct RecoveryEntry: TimelineEntry {
    let date: Date
    let expenses: ExpenseSnapshot?
    let work: WorkSnapshot?
}

struct RecoveryEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RecoveryEntry
    var body: some View {
        RecoveryWidgetView(snapshot: entry.expenses, date: entry.date, family: family, work: entry.work)
            .padding(family == .systemSmall ? 10 : 16)
            .containerBackground(WidgetStyle.background, for: .widget)
            .widgetURL(URL(string: "worktoday://expenses"))
    }
}

struct RecoveryProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecoveryEntry {
        RecoveryEntry(date: .now, expenses: .sample(), work: .sample())
    }
    func getSnapshot(in context: Context, completion: @escaping (RecoveryEntry) -> Void) {
        completion(RecoveryEntry(date: .now, expenses: context.isPreview ? .sample() : ExpenseStore.load(),
                                 work: context.isPreview ? .sample() : SnapshotStore.load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<RecoveryEntry>) -> Void) {
        Task {
            if CredentialStore.load() != nil {
                _ = try? await CloudSync.shared.sync()
                _ = try? await CloudSync.shared.syncExpenses()
            }
            let now = Date()
            let work = SnapshotStore.load()
            let expenses = ExpenseStore.load()
            let dates = RecoveryState.timelineDates(expenses: expenses, work: work, from: now)
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = ExpenseSnapshot.zone
            completion(Timeline(entries: dates.map { RecoveryEntry(date: $0, expenses: expenses, work: work) },
                policy: .after(ScheduleRefresh.nextMidnight(after: now, calendar: calendar))))
        }
    }
}

@main
struct WorkWidgets: WidgetBundle {
    var body: some Widget {
        WorkTodayWidget()
        MonthlyExpenseWidget()
        RecoveryWidget()
    }
}
