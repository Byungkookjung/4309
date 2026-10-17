import SwiftUI
import WidgetKit

struct MonthlyExpenseView: View {
    let snapshot: ExpenseSnapshot?
    let date: Date
    var family: WidgetFamily = .systemMedium
    private var small: Bool { family == .systemSmall }
    var body: some View {
        VStack(alignment: .leading, spacing: small ? 4 : 8) {
            HStack(spacing: 4) {
                Text("THIS MONTH").font(.system(size: 10, weight: .bold, design: .rounded))
                Spacer(minLength: 2)
                if let snapshot, snapshot.matches(date), let angry = snapshot.isOverspending {
                    MoneyMood(angry: angry).frame(width: 24, height: 24)
                } else {
                    Text(ExpenseSnapshot.monthKey(date)).font(.system(size: 10, design: .rounded)).foregroundStyle(.secondary)
                }
            }.lineLimit(1).minimumScaleFactor(0.7)
            if let snapshot, snapshot.matches(date), let income = snapshot.income {
                if small {
                    VStack(alignment: .leading, spacing: 4) {
                        compactMetric("Spent", snapshot.total, color: WidgetStyle.coral)
                        compactMetric("Earned", income, color: WidgetStyle.mint)
                    }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                } else {
                    VStack(spacing: 6) {
                        moneyRow("Spent", snapshot.total, color: WidgetStyle.coral)
                        moneyRow("Earned", income, color: WidgetStyle.mint)
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                WidgetStamp(sample: snapshot.isSample, updated: snapshot.updatedAt)
            } else {
                Spacer(minLength: 0)
                Label("Sync your ledger", systemImage: "arrow.triangle.2.circlepath").font(.subheadline)
                Text("Open app · Sync now").font(.caption).foregroundStyle(.secondary)
                Spacer(minLength: 0)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private func compactMetric(_ title: String, _ value: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.system(size: 9, weight: .medium, design: .rounded)).foregroundStyle(.secondary)
            Text(WidgetStyle.money(value)).font(.system(size: 21, weight: .bold, design: .rounded))
                .monospacedDigit().foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    private func moneyRow(_ title: String, _ value: Double, color: Color) -> some View {
        HStack(spacing: 8) {
            Text(title).font(.system(size: 11, weight: .medium, design: .rounded)).foregroundStyle(.secondary)
            Text(WidgetStyle.money(value)).font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(color).monospacedDigit().lineLimit(1).minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityLabel("\(title) \(WidgetStyle.money(value))")
        }.padding(.horizontal, 10).padding(.vertical, 2)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(color.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct RecoveryClock: View {
    let state: RecoveryState?
    var showTimer = true

    var body: some View {
        GeometryReader { proxy in
            let side = min(proxy.size.width, proxy.size.height)
            ZStack {
                CatClockDecoration(resting: state?.active != true).accessibilityHidden(true)
                Circle().stroke(WidgetStyle.sky.opacity(0.20), lineWidth: 6)
                    .frame(width: side * 0.82, height: side * 0.82)
                    .position(x: side * 0.5, y: side * 0.56)
                Circle().trim(from: 0, to: state?.fraction ?? 0)
                    .stroke(WidgetStyle.sky, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: side * 0.82, height: side * 0.82)
                    .position(x: side * 0.5, y: side * 0.56)
                Image(systemName: "leaf.fill")
                    .font(.system(size: side * 0.08, weight: .bold))
                    .foregroundStyle(WidgetStyle.skyInk)
                    .frame(width: side * 0.14, height: side * 0.14)
                    .background(.white, in: Circle())
                    .position(x: side * (0.5 + 0.41 * sin((state?.fraction ?? 0) * 2 * .pi)),
                              y: side * (0.56 - 0.41 * cos((state?.fraction ?? 0) * 2 * .pi)))
                    .accessibilityHidden(true)
                VStack(spacing: 3) {
                    if showTimer {
                        RecoveryTimeText(state: state)
                            .font(.system(size: side >= 135 ? 22 : 18, weight: .bold, design: .rounded))
                            .monospacedDigit().multilineTextAlignment(.center)
                            .frame(width: side * 0.70).lineLimit(1).minimumScaleFactor(0.45)
                        Text("h : m : s").font(.system(size: 8, design: .rounded)).foregroundStyle(.secondary)
                        Text(state?.status ?? "Sync needed").font(.system(size: 8, weight: .semibold, design: .rounded))
                            .lineLimit(1).minimumScaleFactor(0.7)
                    } else {
                        Text(state?.fraction ?? 0, format: .percent.precision(.fractionLength(0)))
                            .font(.system(size: min(24, side * 0.22), weight: .bold, design: .rounded))
                        Text("earned back").font(.system(size: 8, design: .rounded)).foregroundStyle(.secondary)
                    }
                }.foregroundStyle(WidgetStyle.skyInk)
                    .frame(width: side * 0.72)
                    .position(x: side * 0.5, y: side * 0.67)
            }.frame(width: side, height: side)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }.aspectRatio(1, contentMode: .fit)
        .accessibilityElement(children: .combine)
    }
}

// Vector ears and whiskers stay crisp at every widget size without emoji-font dependencies.
private struct CatClockDecoration: View {
    var resting = false
    var body: some View {
        Canvas { context, size in
            let s = min(size.width, size.height)
            let green = WidgetStyle.sky
            context.fill(Path(ellipseIn: CGRect(x: s * 0.1, y: s * 0.12, width: s * 0.8, height: s * 0.45)), with: .color(green.opacity(0.28)))
            for x in [0.2, 0.65] {
                context.fill(Path(ellipseIn: CGRect(x: s * x, y: s * 0.04, width: s * 0.16, height: s * 0.2)), with: .color(green))
                context.fill(Path(ellipseIn: CGRect(x: s * (x + 0.06), y: s * 0.10, width: s * 0.04, height: s * (resting ? 0.015 : 0.05))), with: .color(WidgetStyle.skyInk))
            }
            for x in [0.46, 0.53] {
                context.fill(Path(ellipseIn: CGRect(x: s * x, y: s * 0.25, width: s * 0.025, height: s * 0.025)), with: .color(WidgetStyle.skyInk))
            }
            var smile = Path()
            smile.move(to: CGPoint(x: s * 0.23, y: s * 0.28))
            smile.addQuadCurve(to: CGPoint(x: s * 0.77, y: s * 0.28), control: CGPoint(x: s * 0.5, y: s * 0.55))
            context.stroke(smile, with: .color(WidgetStyle.skyInk), style: StrokeStyle(lineWidth: max(1.5, s * 0.018), lineCap: .round))
        }
    }
}

struct RecoveryWidgetView: View {
    let snapshot: ExpenseSnapshot?
    let date: Date
    var family: WidgetFamily = .systemMedium
    var work: WorkSnapshot? = nil
    private var state: RecoveryState? { RecoveryState.make(expenses: snapshot, work: work, at: date) }
    private var current: ExpenseSnapshot? { snapshot?.matches(date) == true ? snapshot : nil }
    private var duration: String {
        guard let state else { return "Sync data" }
        let seconds = Int(min(999_999_999, ceil(state.required)))
        return "\(seconds / 3600)h \((seconds % 3600) / 60)m \(seconds % 60)s"
    }
    private func clockSize(_ size: CGSize) -> CGFloat {
        let remaining = size.height - (family == .systemLarge ? 150 : 40)
        return max(70, min(size.width * 0.37, remaining))
    }
    var body: some View {
        GeometryReader { geometry in
        if family == .systemSmall {
            RecoveryClock(state: state)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Label("EARN IT BACK", systemImage: "leaf.fill")
                    .font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(WidgetStyle.skyInk)
                HStack(spacing: 12) {
                    RecoveryClock(state: state, showTimer: false)
                        .frame(width: clockSize(geometry.size), height: clockSize(geometry.size))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(state?.status ?? "Sync schedules & ledger").font(.system(size: 10, design: .rounded)).foregroundStyle(.secondary)
                        RecoveryTimeText(state: state)
                            .foregroundStyle(WidgetStyle.skyInk)
                            .font(.system(size: family == .systemLarge ? 46 : 40, weight: .bold, design: .rounded))
                            .monospacedDigit().multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading).lineLimit(1).minimumScaleFactor(0.45)
                        Text("h : m : s").font(.system(size: 9, design: .rounded)).foregroundStyle(.secondary)
                        Text("After income: \(duration)").font(.system(size: 10, weight: .medium, design: .rounded))
                            .lineLimit(2).minimumScaleFactor(0.7)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }.frame(maxWidth: .infinity, maxHeight: .infinity)
                if family == .systemLarge {
                    if let current, let income = current.income {
                        Text("\(WidgetStyle.money(current.total)) spent · \(WidgetStyle.money(income)) earned · $15/hr")
                            .font(.system(size: 12, design: .rounded)).lineLimit(2).minimumScaleFactor(0.7)
                    }
                    HStack(alignment: .top, spacing: 8) {
                        Image(MoneyAdvice.tip(at: date).asset).resizable().scaledToFit()
                            .frame(width: 28, height: 28).accessibilityHidden(true)
                        Text(MoneyAdvice.tip(at: date).text)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .fixedSize(horizontal: false, vertical: true).lineSpacing(3)
                    }.accessibilityElement(children: .ignore)
                        .accessibilityLabel(MoneyAdvice.tip(at: date).emoji + " " + MoneyAdvice.tip(at: date).text)
                        .padding(12).frame(maxWidth: .infinity, alignment: .leading)
                        .background(WidgetStyle.sky.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
                    Text("Based on schedules. Breaks reserved at shift end.")
                        .font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                }
                if let current { WidgetStamp(sample: current.isSample, updated: current.updatedAt) }
            }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        }
    }
}

struct RecoveryTimeText: View {
    let state: RecoveryState?
    var body: some View {
        Group {
        if let state {
            if state.active && state.remaining > 0 {
                Text(timerInterval: state.date...state.countdownEnd, countsDown: true, showsHours: true)
            } else {
                Text(RecoveryState.displayDuration(state.remaining))
            }
        } else { Text("--:--:--") }
        }.accessibilityIdentifier("recoveryCountdown")
    }
}
