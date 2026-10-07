import XCTest
import SwiftUI
import WidgetKit
@testable import WorkToday

final class WidgetLayoutTests: XCTestCase {
    @MainActor func testCompactLayoutsWithLongNamesAndLargeAmounts() throws {
        let now = Date()
        let jobs = [
            JobDay(id: "iron", name: "Iron Peak Auto Repair - A very long workplace name that must never overlap the pay amount", checkIn: "00:00", checkOut: "23:59", hours: 23.48, amount: 999999.99, status: "scheduled"),
            JobDay(id: "booster", name: "Booster Juice / 한글이 포함된 아주 긴 이름과 추가 설명 https://example.com/averylongunbrokenword", checkIn: "12:00", checkOut: "23:59", hours: 11.48, amount: 999999.99, status: "scheduled")]
        let work = WorkSnapshot(version: 1, isSample: true, generatedAt: ISO8601DateFormatter().string(from: now), timeZone: TimeZone.current.identifier,
            days: (0...1).map { WorkDay(date: WorkSnapshot.key(Calendar.current.date(byAdding: .day, value: $0, to: now)!), jobs: jobs) })
        let money = ExpenseSnapshot(month: ExpenseSnapshot.monthKey(now), total: 999999.99, count: 10000, updatedAt: now, isSample: true, income: 123456.78)
        for (family, width, height, name) in [(WidgetFamily.systemSmall, 126.0, 126.0, "Small"), (.systemMedium, 280.0, 126.0, "Medium"), (.systemLarge, 280.0, 292.0, "Large")] {
            let views: [(String, AnyView)] = [
                ("Work", AnyView(TodayWidgetView(snapshot: work, date: now, family: family))),
                ("Money", AnyView(MonthlyExpenseView(snapshot: money, date: now, family: family))),
                ("Clock", AnyView(RecoveryWidgetView(snapshot: money, date: now, family: family, work: work)))]
            for (title, view) in views {
                let renderer = ImageRenderer(content: view.frame(width: width, height: height).padding(16).background(Color.white))
                renderer.scale = 2
                let image = try XCTUnwrap(renderer.uiImage)
                XCTAssertEqual(image.size.width, width + 32, accuracy: 1)
                let attachment = XCTAttachment(image: image)
                attachment.name = "Stress \(title) \(name)"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
    }
}
