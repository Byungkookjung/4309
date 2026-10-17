import SwiftUI

// Shared native styling for every widget and its in-app preview.
enum WidgetStyle {
    static let ink = Color.primary
    static let mint = Color(red: 0.12, green: 0.53, blue: 0.39)
    static let coral = Color(red: 0.78, green: 0.26, blue: 0.30)
    static let sky = Color(red: 0.62, green: 0.74, blue: 0.35)
    static let skyInk = Color(red: 0.25, green: 0.36, blue: 0.18)
    static let background = Color(.secondarySystemGroupedBackground)
    static func money(_ value: Double) -> String {
        value.formatted(.currency(code: "CAD").locale(Locale(identifier: "en_CA")))
    }
}

struct WidgetStamp: View {
    let sample: Bool
    let updated: Date
    var body: some View {
        Text(sample ? "SAMPLE · CAD" : "Updated \(updated.formatted(date: .numeric, time: .shortened))")
            .font(.system(size: 9, design: .rounded)).foregroundStyle(.secondary)
            .lineLimit(1).minimumScaleFactor(0.65)
    }
}

// Vector emoji stays crisp and does not depend on a device's emoji font.
struct MoneyMood: View {
    let angry: Bool
    var body: some View {
        GeometryReader { proxy in
            let size = min(proxy.size.width, proxy.size.height)
            let ink = Color(red: 0.32, green: 0.23, blue: 0.20)
            ZStack {
                Ellipse().fill(angry ? Color(red: 0.83, green: 0.79, blue: 0.48) : Color(red: 0.70, green: 0.81, blue: 0.44))
                ForEach([-1.0, 1.0], id: \.self) { side in
                    Circle().fill(WidgetStyle.sky).frame(width: size * 0.30).offset(x: side * size * 0.29, y: -size * 0.30)
                }
                Ellipse().fill(Color.pink.opacity(0.3)).frame(width: size * 0.18, height: size * 0.10).offset(x: -size * 0.27, y: size * 0.10)
                Ellipse().fill(Color.pink.opacity(0.3)).frame(width: size * 0.18, height: size * 0.10).offset(x: size * 0.27, y: size * 0.10)
                Circle().fill(ink).frame(width: size * 0.07, height: size * 0.07).offset(x: -size * 0.17, y: -size * 0.07)
                Circle().fill(ink).frame(width: size * 0.07, height: size * 0.07).offset(x: size * 0.17, y: -size * 0.07)
                Path { path in
                    path.move(to: CGPoint(x: size * 0.34, y: size * (angry ? 0.72 : 0.60)))
                    path.addQuadCurve(to: CGPoint(x: size * 0.66, y: size * (angry ? 0.72 : 0.60)),
                        control: CGPoint(x: size * 0.5, y: size * (angry ? 0.51 : 0.84)))
                    if angry {
                        path.move(to: CGPoint(x: size * 0.23, y: size * 0.29))
                        path.addLine(to: CGPoint(x: size * 0.40, y: size * 0.35))
                        path.move(to: CGPoint(x: size * 0.60, y: size * 0.35))
                        path.addLine(to: CGPoint(x: size * 0.77, y: size * 0.29))
                    }
                }.stroke(ink, style: StrokeStyle(lineWidth: max(1.5, size * 0.045), lineCap: .round))
            }.frame(width: size, height: size)
        }.aspectRatio(1, contentMode: .fit)
            .accessibilityLabel(angry ? "Angry: spending exceeds income" : "Happy: income covers spending")
    }
}
