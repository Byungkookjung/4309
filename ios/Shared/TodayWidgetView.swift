import SwiftUI
import WidgetKit

struct TodayWidgetView: View {
    let snapshot: WorkSnapshot?
    let date: Date
    var family: WidgetFamily = .systemMedium
    private var small: Bool { family == .systemSmall }
    private var large: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: small ? 4 : 8) {
            HStack {
                Label("TODAY", systemImage: "sun.max.fill").font(.system(size: 11, weight: .bold, design: .rounded))
                Spacer()
                if !small {
                    Text(snapshot.map { WorkSnapshot.key(date, zone: $0.calendar.timeZone) } ?? WorkSnapshot.key(date))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            if let day = snapshot?.day(at: date) {
                ForEach(day.jobs.sorted { $0.id > $1.id }) { job in
                    jobRow(job)
                }
                if large {
                    Divider().padding(.vertical, 2)
                    Label("TOMORROW", systemImage: "sparkle").font(.system(size: 11, weight: .bold, design: .rounded))
                    if let calendar = snapshot?.calendar,
                       let tomorrow = calendar.date(byAdding: .day, value: 1, to: date),
                       let next = snapshot?.day(at: tomorrow) {
                        ForEach(next.jobs.sorted { $0.id > $1.id }) { job in jobRow(job) }
                    } else {
                        Text("Open the app to sync tomorrow's schedules.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Text(footer).font(.system(size: small ? 8 : 9)).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
            } else {
                Spacer()
                Text(snapshot == nil ? "Connect your schedules" : "Schedule needs updating")
                    .font(small ? .subheadline.bold() : .headline)
                Text("Open Work Today").font(.caption).foregroundStyle(.secondary)
                Spacer()
            }
        }.fontDesign(.rounded)
    }
    private var footer: String {
        guard let snapshot else { return "" }
        if snapshot.isSample { return "SAMPLE / Estimated CAD" }
        let raw = String(snapshot.generatedAt.prefix(16)).replacingOccurrences(of: "T", with: " ")
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let saved = formatter.date(from: snapshot.generatedAt) ?? ISO8601DateFormatter().date(from: snapshot.generatedAt)
        let label = saved.map { $0.formatted(date: .numeric, time: .shortened) } ?? raw
        return "Updated \(label)"
    }
    @ViewBuilder private func jobRow(_ job: JobDay) -> some View {
        let tint: Color = job.id == "booster" ? .purple : .green
        HStack(spacing: small ? 5 : 8) {
            RoundedRectangle(cornerRadius: 2).fill(tint).frame(width: 3)
            VStack(alignment: .leading, spacing: small ? 1 : 3) {
                Text(small && job.id == "iron" ? "Iron Peak" : job.name)
                    .font(.system(size: small ? 12 : large ? 16 : 12, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
                Text(job.status == "off" ? "No shift" : job.timeLabel).font(.system(size: small ? 10 : large ? 13 : 12)).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.65)
                if small { amount(job, color: tint) }
            }
            if !small { Spacer(minLength: 2); amount(job, color: tint) }
        }
        .frame(maxWidth: .infinity, maxHeight: small || large ? .infinity : nil, alignment: .leading)
        .padding(.vertical, small ? 2 : 5).padding(.horizontal, small ? 4 : 8)
        .background(tint.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
    }
    @ViewBuilder private func amount(_ job: JobDay, color: Color) -> some View {
        if job.status == "incomplete" { Text("--").foregroundStyle(color) }
        else {
            Text(job.amount, format: .currency(code: "CAD"))
                .font(.system(size: small ? 17 : large ? 20 : 18, weight: .bold, design: .rounded))
                .monospacedDigit().foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.6)
        }
    }
}
