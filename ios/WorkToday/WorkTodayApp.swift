import SwiftUI
import WidgetKit
import UniformTypeIdentifiers

@main
struct WorkTodayApp: App {
    var body: some Scene { WindowGroup { WorkTodayHome() } }
}

struct WorkTodayHome: View {
    @Environment(\.scenePhase) private var phase
    @StateObject private var connection = AccountConnection()
    @State private var snapshot = SnapshotStore.load()
    @State private var expenses = ExpenseStore.load()
    @State private var importing = false
    @State private var message = "Connect to sync your widgets."
    @State private var connected = CredentialStore.load() != nil
    @State private var busy = false
    @State private var size: WidgetFamily = .systemMedium

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Picker("Widget size", selection: $size) {
                        Text("Small").tag(WidgetFamily.systemSmall)
                        Text("Medium").tag(WidgetFamily.systemMedium)
                        Text("Large").tag(WidgetFamily.systemLarge)
                    }.pickerStyle(.segmented)
                    previewCard("Work", height: size == .systemLarge ? 340 : 180) {
                        TodayWidgetView(snapshot: snapshot, date: .now, family: size)
                    }
                    previewCard("Monthly Money", height: 164) {
                        MonthlyExpenseView(snapshot: expenses, date: .now, family: size == .systemLarge ? .systemMedium : size)
                    }
                    previewCard("Earn It Back", height: size == .systemLarge ? 320 : 164) {
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            RecoveryWidgetView(snapshot: expenses, date: context.date, family: size, work: snapshot)
                        }
                    }
                    DisclosureGroup("Account") {
                    Button(connected ? "Reconnect Google account" : "Connect Google account") {
                        Task {
                            busy = true
                            defer { busy = false }
                            do {
                                var credentials = try await connection.connect()
                                credentials.connectionID = UUID().uuidString
                                try CredentialStore.clear()
                                try SnapshotStore.clear()
                                try ExpenseStore.clear()
                                expenses = nil
                                snapshot = nil
                                try CredentialStore.save(credentials)
                                connected = true
                                WidgetCenter.shared.reloadAllTimelines()
                                try await sync()
                            } catch { message = error.localizedDescription; connected = CredentialStore.load() != nil }
                        }
                    }.buttonStyle(.borderedProminent).disabled(busy)
                    if connected {

                        Button("Disconnect and remove widget data", role: .destructive) {
                            do {
                                try CredentialStore.clear(); try SnapshotStore.clear()
                                try ExpenseStore.clear(); expenses = nil
                                connected = false; snapshot = nil
                                WidgetCenter.shared.reloadAllTimelines(); message = "Disconnected. Website records are unchanged."
                            } catch { message = error.localizedDescription }
                        }.disabled(busy)
                    } else {
                        Button("Show sample on widget") { saveSamples() }.disabled(busy)
                        Button("Import schedules manually") { importing = true }.disabled(busy)
                    }
                    }
                    Button { Task { await refresh() } } label: {
                        Label(busy ? "Syncing..." : "Sync now", systemImage: "arrow.triangle.2.circlepath")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }.buttonStyle(.borderedProminent).tint(WidgetStyle.mint).disabled(busy || !connected)

                    Text(message).font(.callout).foregroundStyle(.secondary).accessibilityIdentifier("syncStatus")
                    Text("Auto-sync at midnight · Timing controlled by iOS")
                        .font(.caption).foregroundStyle(.secondary)
                }.padding().frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .background(Color(.systemGroupedBackground)).navigationTitle("Work Today")
            .task {
                // Explicit UI-test fixture only; never enabled in normal launches.
                if ProcessInfo.processInfo.arguments.contains("--ui-test-active") {
                    saveSamples()
                    let now = Date()
                    let start = now.addingTimeInterval(-1800)
                    let formatter = DateFormatter()
                    formatter.locale = Locale(identifier: "en_US_POSIX")
                    formatter.timeZone = ExpenseSnapshot.zone
                    formatter.dateFormat = "HH:mm"
                    let job = JobDay(id: "iron", name: "Iron Peak", checkIn: formatter.string(from: start),
                        checkOut: formatter.string(from: now.addingTimeInterval(3600)), hours: 1.5, amount: 22.5, status: "scheduled")
                    let off = JobDay(id: "booster", name: "Booster Juice", checkIn: "", checkOut: "", hours: 0, amount: 0, status: "off")
                    save(WorkSnapshot(version: 1, isSample: true, generatedAt: ISO8601DateFormatter().string(from: now),
                        timeZone: ExpenseSnapshot.zone.identifier, days: [WorkDay(date: WorkSnapshot.key(start, zone: ExpenseSnapshot.zone), jobs: [job, off])]))
                } else if ProcessInfo.processInfo.arguments.contains("--ui-test-sample") { saveSamples() }
                else { await refresh() }
            }
            .onChange(of: phase) { _, phase in if phase == .active { Task { await refresh() } } }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                do {
                    let url = try result.get()
                    let access = url.startAccessingSecurityScopedResource()
                    defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    guard size <= 2_000_000 else { throw SnapshotError.invalid }
                    save(try WorkSnapshot.decode(Data(contentsOf: url)))
                } catch { message = error.localizedDescription }
            }
        }
    }
    private func previewCard<Content: View>(_ title: String, height: CGFloat, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline).fontDesign(.rounded)
            content().padding(size == .systemSmall ? 10 : 16)
                .frame(width: size == .systemSmall ? 170 : nil, height: size == .systemSmall ? 170 : height)
                .frame(maxWidth: size == .systemSmall ? 170 : .infinity)
                .background(WidgetStyle.background, in: RoundedRectangle(cornerRadius: 24))
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    @MainActor private func sync() async throws {
        var errors: [String] = []
        do { snapshot = try await CloudSync.shared.sync() }
        catch { errors.append("Schedules: \(error.localizedDescription)") }
        do { expenses = try await CloudSync.shared.syncExpenses() }
        catch { errors.append("Ledger: \(error.localizedDescription)") }
        WidgetCenter.shared.reloadAllTimelines()
        message = errors.isEmpty ? "All widgets synced · \(Date.now.formatted(date: .omitted, time: .shortened))." : errors.joined(separator: "\n") + " Last saved data is still shown."
    }
    @MainActor private func refresh() async {
        guard connected, !busy else { return }
        busy = true; defer { busy = false }
        do { try await sync() } catch { message = "\(error.localizedDescription) Last saved data is still shown." }
    }
    private func saveSamples() {
        save(.sample())
        do {
            let sample = ExpenseSnapshot.sample()
            try ExpenseStore.save(sample); expenses = sample
            WidgetCenter.shared.reloadAllTimelines()
        } catch { message = error.localizedDescription }
    }
    private func save(_ value: WorkSnapshot) {
        do {
            try SnapshotStore.save(value); snapshot = value
            WidgetCenter.shared.reloadAllTimelines()
            message = value.isSample ? "Sample preview · Not real data" : "Schedules imported. Widget refresh requested."
        } catch { message = error.localizedDescription }
    }
}
