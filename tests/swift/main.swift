import Foundation

// Run with the JSON downloaded from widget-preview.html as the first argument.
let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
let snapshot = try WorkSnapshot.decode(data)
precondition(snapshot.days.count == 32)
precondition(snapshot.day(at: .now)?.jobs.count == 2)
precondition(snapshot.day(at: .now)?.jobs.first?.amount == 97.5)
precondition(snapshot.day(at: Date.distantFuture) == nil)
let encoded = try JSONEncoder().encode(snapshot)
let roundTrip = try WorkSnapshot.decode(encoded)
precondition(roundTrip.days.count == 32)
let invalid = Data("{\"version\":999}".utf8)
do {
    _ = try WorkSnapshot.decode(invalid)
    fatalError("Invalid snapshot accepted")
} catch { }
print("Web JSON -> Swift model, round trip, expired date and invalid import: OK")
