import Foundation

struct MoneyTip {
    let emoji: String
    let text: String
    let asset: String
}

enum MoneyAdvice {
    static let tips: [MoneyTip] = [
        MoneyTip(emoji: "🌱", text: "Small steps today. More breathing room tomorrow.", asset: "TipSeed"),
        MoneyTip(emoji: "💰", text: "Give each dollar a little job before spending it.", asset: "TipMoney"),
        MoneyTip(emoji: "☕", text: "A homemade coffee can be a tiny win.", asset: "TipCoffee"),
        MoneyTip(emoji: "🛒", text: "Bring a list. Let the extras wait.", asset: "TipCart"),
        MoneyTip(emoji: "✨", text: "Progress counts, even when it is small.", asset: "TipSparkle"),
        MoneyTip(emoji: "🐢", text: "Slow and steady is still moving forward.", asset: "TipTurtle"),
        MoneyTip(emoji: "🧾", text: "Check one receipt. Learn one thing.", asset: "TipReceipt"),
        MoneyTip(emoji: "🎯", text: "Pick one small saving goal for this week.", asset: "TipTarget"),
        MoneyTip(emoji: "🍱", text: "Tomorrow's packed lunch is a gift to future you.", asset: "TipLunch"),
        MoneyTip(emoji: "🪙", text: "Little amounts deserve a little attention too.", asset: "TipCoin"),
        MoneyTip(emoji: "📝", text: "Write it down before you check out.", asset: "TipNote"),
        MoneyTip(emoji: "🐷", text: "Let a little of each payday stay with you.", asset: "TipPig"),
        MoneyTip(emoji: "🌱", text: "A quieter spending day helps your plans grow.", asset: "TipSeed"),
        MoneyTip(emoji: "💰", text: "A discount only saves money if you need the item.", asset: "TipMoney"),
        MoneyTip(emoji: "☕", text: "Enjoy your treat. Just make room for it first.", asset: "TipCoffee"),
        MoneyTip(emoji: "🛒", text: "Check your cupboard before filling your cart.", asset: "TipCart"),
        MoneyTip(emoji: "✨", text: "You can reset your plan without starting over.", asset: "TipSparkle"),
        MoneyTip(emoji: "🐢", text: "Sleep on a nonessential purchase before buying.", asset: "TipTurtle"),
        MoneyTip(emoji: "🧾", text: "An unused subscription is worth a second look.", asset: "TipReceipt"),
        MoneyTip(emoji: "🎯", text: "Compare the price with the work hours it takes.", asset: "TipTarget"),
        MoneyTip(emoji: "🍱", text: "Use what you already have. That counts as a win.", asset: "TipLunch"),
        MoneyTip(emoji: "🪙", text: "Keep a little cushion for unexpected days.", asset: "TipCoin"),
        MoneyTip(emoji: "📝", text: "Review this week gently. Choose one next step.", asset: "TipNote"),
        MoneyTip(emoji: "🐷", text: "Celebrate a small saving, not just a big number.", asset: "TipPig")
    ]
    static func tip(at date: Date) -> MoneyTip {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = ExpenseSnapshot.zone
        let day = calendar.ordinality(of: .day, in: .era, for: date) ?? 1
        return tips[(day - 1) % tips.count]
    }
}
