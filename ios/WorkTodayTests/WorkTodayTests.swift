import XCTest
import CryptoKit
@testable import WorkToday

final class WorkTodayTests: XCTestCase {
    @MainActor func testWebCryptoConnectionAndRejectWrongState() throws {
        let url = Bundle(for: Self.self).url(forResource: "connection-fixture", withExtension: "json")!
        let fixture = try JSONDecoder().decode([String: String].self, from: Data(contentsOf: url))
        let key = try P256.KeyAgreement.PrivateKey(rawRepresentation: Data(base64Encoded: fixture["privateKey"]!)!)
        let callback = URL(string: fixture["callback"]!)!
        let credentials = try AccountConnection.decrypt(callback, privateKey: key, state: fixture["state"]!)
        XCTAssertEqual(credentials.uid, "test-only")
        XCTAssertEqual(credentials.refreshToken, "fake-not-a-token")
        XCTAssertThrowsError(try AccountConnection.decrypt(callback, privateKey: key, state: "wrong"))
        XCTAssertThrowsError(try AccountConnection.decrypt(callback, privateKey: P256.KeyAgreement.PrivateKey(), state: fixture["state"]!))
    }
    func testShiftCalculations() {
        let regular = ShiftEstimate.make(id: "booster", name: "Booster", checkIn: "14:15", checkOut: "21:15", rate: 15, multiplier: 1)
        XCTAssertEqual(regular.hours, 6.5)
        XCTAssertEqual(regular.amount, 97.5)
        let holiday = ShiftEstimate.make(id: "iron", name: "Iron", checkIn: "22:00", checkOut: "06:00", rate: 20, multiplier: 1.5)
        XCTAssertEqual(holiday.amount, 225)
        XCTAssertEqual(ShiftEstimate.make(id: "iron", name: "Iron", checkIn: "09:00", checkOut: "", rate: 20, multiplier: 1).status, "incomplete")
    }
    func testSharedWidgetStorage() throws {
        let previous = SnapshotStore.load()
        defer {
            if let previous { try? SnapshotStore.save(previous) }
            else { try? SnapshotStore.clear() }
        }
        XCTAssertNotNil(SnapshotStore.fileURL, "Missing App Group entitlement")
        try SnapshotStore.save(.sample())
        XCTAssertEqual(SnapshotStore.load()?.day(at: .now)?.jobs.count, 2)
    }
    func testSharedKeychain() throws {
        guard CredentialStore.load() == nil else { throw XCTSkip("Do not overwrite an existing account") }
        defer { try? CredentialStore.clear() }
        try CredentialStore.save(CloudCredentials(uid: "test-only", refreshToken: "fake-not-a-token", connectionID: "test"))
        XCTAssertEqual(CredentialStore.load()?.uid, "test-only")
        try CredentialStore.clear()
        XCTAssertNil(CredentialStore.load())
    }
    func testMissingDateDoesNotShowYesterday() {
        let sample = WorkSnapshot.sample()
        XCTAssertNil(sample.day(at: .now.addingTimeInterval(86400 * 2)))
    }
}
