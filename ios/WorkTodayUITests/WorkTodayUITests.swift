import XCTest

final class WorkTodayUITests: XCTestCase {
    func testCountdownChangesDuringActiveWork() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-test-active"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Working now"].waitForExistence(timeout: 10))
        app.swipeUp()
        let timer = app.staticTexts["recoveryCountdown"].firstMatch
        XCTAssertTrue(timer.waitForExistence(timeout: 5))
        let before = timer.label
        let changed = NSPredicate { _, _ in timer.label != before }
        expectation(for: changed, evaluatedWith: nil)
        waitForExpectations(timeout: 6)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Active countdown in seconds"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    func testSampleAndAllSizes() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-test-sample"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Sample preview · Not real data"].waitForExistence(timeout: 10))
        for size in ["Small", "Medium", "Large"] {
            app.segmentedControls.buttons[size].tap()
            XCTAssertTrue(app.staticTexts["Booster Juice"].firstMatch.exists)
            XCTAssertTrue(app.staticTexts[size == "Small" ? "Iron Peak" : "Iron Peak Auto Repair"].firstMatch.exists)
            if size == "Large" {
                XCTAssertTrue(app.staticTexts["TOMORROW"].exists)
                XCTAssertEqual(app.staticTexts.matching(identifier: "Booster Juice").count, 2)
            }
            XCTAssertTrue(app.staticTexts["THIS MONTH"].exists)
            XCTAssertTrue(app.staticTexts["SAMPLE / Estimated CAD"].exists)
            let attachment = XCTAttachment(screenshot: app.screenshot())
            attachment.name = "Widget \(size)"
            attachment.lifetime = .keepAlways
            add(attachment)
            app.swipeUp()
            let lower = XCTAttachment(screenshot: app.screenshot())
            lower.name = "Money and clock \(size)"
            lower.lifetime = .keepAlways
            add(lower)
            app.swipeDown()
            app.swipeDown()
        }
    }
}
