import AlarmKit
import ActivityKit
import AppIntents
import SwiftUI
import CryptoKit

@available(iOS 26.0, *)
private struct PlannerMetadata: AlarmMetadata {}
@available(iOS 26.0, *)
struct ConfirmPlannerAlarm: LiveActivityIntent {
    static var title: LocalizedStringResource = "Confirmar lembrete"
    @Parameter(title: "Identificador") var identifier: String
    init() { identifier = "" }
    init(_ id: UUID) { identifier = id.uuidString }
    func perform() async throws -> some IntentResult {
        if let id = UUID(uuidString: identifier) { try? AlarmManager.shared.stop(id: id) }
        await PlannerAlarms.shared.restore()
        return .result()
    }
}

@available(iOS 26.0, *)
@MainActor final class PlannerAlarms {
    static let shared = PlannerAlarms()
    var report: (String) -> Void = { _ in }
    private let manager = AlarmManager.shared
    private let defaults = UserDefaults.standard
    private var latest: [String: Any]?
    private var busy = false
    private struct Item {
        let id: UUID
        let title: String
        let fire: Date
        let schedule: Alarm.Schedule
        let signature: String
        var voice: String? = nil
    }
    private func id(_ key: String) -> UUID {
        var bytes = Array(SHA256.hash(data: Data(key.utf8)).prefix(16))
        bytes[6] = (bytes[6] & 15) | 80
        bytes[8] = (bytes[8] & 63) | 128
        return bytes.withUnsafeBytes { UUID(uuid: $0.loadUnaligned(as: uuid_t.self)) }
    }
    private func items(_ snapshot: [String: Any]) -> [Item] {
        let cal = Calendar.current, now = Date()
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.timeZone = .current
        fmt.dateFormat = "yyyy-MM-dd"
        let weekdays: [Locale.Weekday] = [.sunday,.monday,.tuesday,.wednesday,.thursday,.friday,.saturday]
        var result: [Item] = []
        for task in snapshot["tasks"] as? [[String: Any]] ?? [] {
            guard let key = task["id"] as? String, let title = task["title"] as? String,
                  let day = task["date"] as? String, let start = fmt.date(from: day),
                  let time = task["time"] as? String, let mins = task["reminder"] as? Int, mins >= 0 else { continue }
            let hm = time.split(separator: ":").compactMap { Int($0) }
            guard hm.count == 2 else { continue }
            let repeatMode = task["repeat"] as? String
            let step = repeatMode == "Diariamente" ? 1 : repeatMode == "Semanalmente" ? 7 : 0
            let done = task["done"] as? [String: Bool] ?? [:]
            let elapsed = max(0, cal.dateComponents([.day], from: start, to: cal.startOfDay(for: now)).day ?? 0)
            var dayOffset = step > 0 ? elapsed / step * step : 0
            while let occurrence = cal.date(byAdding: .day, value: dayOffset, to: start),
                  let due = cal.date(bySettingHour: hm[0], minute: hm[1], second: 0, of: occurrence) {
                let fire = due.addingTimeInterval(-Double(mins * 60))
                if fire > now && done[fmt.string(from: occurrence)] != true {
                    var schedule: Alarm.Schedule = .fixed(fire)
                    var sig = "fixed \(fire.timeIntervalSince1970)"
                    if step > 0 {
                        let ws = step == 1 ? weekdays : [weekdays[cal.component(.weekday, from: fire)-1]]
                        // A relative schedule is safe only if its first delivery equals the intended occurrence.
                        let previous = cal.date(byAdding: .day, value: -step, to: fire) ?? fire
                        let futureCompletions = done.contains { $0.value && $0.key > fmt.string(from: occurrence) }
                        if previous <= now && !futureCompletions {
                            let hour = cal.component(.hour, from: fire), minute = cal.component(.minute, from: fire)
                            schedule = .relative(.init(time: .init(hour: hour, minute: minute), repeats: .weekly(ws)))
                            sig = "repeat \(step) \(hour) \(minute) \(step == 1 ? 0 : cal.component(.weekday, from: fire))"
                        }
                    }
                    let voice = snapshot["speech"] as? Bool != false && task["readAloud"] as? Bool != false ? (snapshot["locale"] as? String ?? "pt-PT") : nil
                    result.append(Item(id: id(key), title: title, fire: fire, schedule: schedule, signature: sig+" "+title+" "+(voice ?? ""), voice: voice))
                    break
                }
                if step == 0 { break }
                dayOffset += step
            }
        }
        for (key,title) in [("focus","Fim da sessão de foco"),("training","Fim do temporizador de treino")] {
            let fire = Date(timeIntervalSince1970: (snapshot[key] as? Double ?? 0)/1000)
            if fire > now { result.append(Item(id: id(key), title: title, fire: fire, schedule: .fixed(fire), signature: String(fire.timeIntervalSince1970))) }
        }
        return result.sorted { $0.fire < $1.fire }
    }
    func restore() async {
        if let bytes = defaults.data(forKey: "alarmSnapshot"), let body = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any] { await sync(body) }
    }
    func sync(_ body: [String: Any]) async {
        latest = body
        if let bytes = try? JSONSerialization.data(withJSONObject: body) { defaults.set(bytes, forKey: "alarmSnapshot") }
        guard !busy else { return }
        busy = true
        defer { busy = false }
        while let snapshot = latest {
            latest = nil
            do {
                let wanted = items(snapshot)
                if !wanted.isEmpty && manager.authorizationState != .authorized {
                    guard try await manager.requestAuthorization() == .authorized else { report("Ativa os alarmes do Pug Planner nas Definições do iPhone."); continue }
                }
                guard manager.authorizationState == .authorized else { continue }
                let existing = try manager.alarms
                let ids = Set(existing.map(\.id))
                let desired = Set(wanted.map(\.id))
                var tones = defaults.dictionary(forKey:"alarmTones") as? [String:String] ?? [:]
                var signatures = defaults.dictionary(forKey: "alarmSignatures") as? [String: String] ?? [:]
                defer {
                    tones = tones.filter { pair in wanted.contains { $0.id.uuidString == pair.key } || existing.contains { $0.id.uuidString == pair.key && $0.state == .alerting } }
                    defaults.set(tones, forKey:"alarmTones")
                    defaults.set(signatures, forKey:"alarmSignatures")
                    if let folder = FileManager.default.urls(for:.libraryDirectory,in:.userDomainMask).first?.appendingPathComponent("Sounds"),
                       let files = try? FileManager.default.contentsOfDirectory(at:folder,includingPropertiesForKeys:nil) {
                        let keep = Set(tones.values)
                        for url in files where url.lastPathComponent.hasPrefix("pug-") && url.pathExtension == "caf" && !keep.contains(url.lastPathComponent) {
                            try? FileManager.default.removeItem(at:url)
                        }
                    }
                }
                for old in existing where !desired.contains(old.id) {
                    // A delivered alarm remains until its individual acknowledgement.
                    if old.state == .alerting { continue }
                    try manager.cancel(id: old.id)
                    signatures.removeValue(forKey: old.id.uuidString)
                }
                for item in wanted {
                    if ids.contains(item.id) && signatures[item.id.uuidString] == item.signature { continue }
                    if existing.contains(where: { $0.id == item.id && $0.state == .alerting }) { continue }
                    if ids.contains(item.id) { try manager.cancel(id: item.id) }
                    let stop = AlarmButton(text: "Confirmar", textColor: .white, systemImageName: "checkmark")
                    let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: item.title), stopButton: stop)
                    let attributes = AlarmAttributes<PlannerMetadata>(presentation: AlarmPresentation(alert: alert), tintColor: Color(red: 0.44, green: 0.52, blue: 0.42))
                    var sound = "reminder_ring.wav"
                    if let locale = item.voice {
                        do { sound = try await SpokenTone.name(for:item.title,locale:locale) }
                        catch { report("Voz indisponível para este lembrete. Será usado o toque do Pug.") }
                    }
                    let config = AlarmManager.AlarmConfiguration<PlannerMetadata>.alarm(schedule: item.schedule, attributes: attributes, stopIntent: ConfirmPlannerAlarm(item.id), sound: .named(sound))
                    _ = try await manager.schedule(id: item.id, configuration: config)
                    tones[item.id.uuidString] = sound
                    signatures[item.id.uuidString] = item.signature
                }
            } catch { report("Não foi possível programar todos os alarmes. \(error.localizedDescription)") }
        }
    }
}
