import Foundation
import UserNotifications

@MainActor final class LocalReminders: NSObject, UNUserNotificationCenterDelegate {
    private let center = UNUserNotificationCenter.current()
    private var nextSnapshot: [String:Any]?
    private var updating = false
    var report: (String) -> Void = { _ in }

    private struct Entry {
        let id: String
        let title: String
        let time: Date
        var voice: String? = nil
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner,.sound,.list])
    }

    func diagnose() async {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: report("Notificações locais permitidas. Verifica também o som nas Definições.")
        case .denied: report("Permite as notificações em Definições → Notificações → Pug Planner.")
        default: report("O iPhone pedirá autorização ao programar o primeiro lembrete.")
        }
    }

    private func upcoming(_ snapshot: [String:Any]) -> [Entry] {
        let now = Date()
        var calendar = Calendar(identifier:.gregorian)
        calendar.timeZone = .current
        let format = DateFormatter()
        format.locale = Locale(identifier:"en_US_POSIX")
        format.calendar = calendar
        format.timeZone = .current
        format.dateFormat = "yyyy-MM-dd"
        var list: [Entry] = []
        for (key,title) in [("focus","Fim da sessão de foco"),("training","Fim do temporizador de treino")] {
            let time = Date(timeIntervalSince1970:(snapshot[key] as? Double ?? 0)/1000)
            if time > now { list.append(Entry(id:key,title:title,time:time)) }
        }
        for task in snapshot["tasks"] as? [[String:Any]] ?? [] {
            guard let id = task["id"] as? String, let title = task["title"] as? String,
                  let date = task["date"] as? String, let start = format.date(from:date),
                  let clock = task["time"] as? String, let offset = task["reminder"] as? Int, offset >= 0 else { continue }
            let hm = clock.split(separator:":").compactMap { Int($0) }
            guard hm.count == 2 else { continue }
            let recurrence = task["repeat"] as? String
            let interval = recurrence == "Diariamente" ? 1 : recurrence == "Semanalmente" ? 7 : 0
            let elapsed = max(0,calendar.dateComponents([.day],from:start,to:calendar.startOfDay(for:now)).day ?? 0)
            var n = interval == 0 ? 0 : elapsed / interval * interval
            let done = task["done"] as? [String:Bool] ?? [:]
            let voice = snapshot["speech"] as? Bool != false && task["readAloud"] as? Bool != false ? (snapshot["locale"] as? String ?? "pt-PT") : nil
            let cutoff = list.count >= 64 ? list.last?.time : nil
            var added = 0
            while added < 64, let day = calendar.date(byAdding:.day,value:n,to:start),
                  let due = calendar.date(bySettingHour:hm[0],minute:hm[1],second:0,of:day) {
                let fire = due.addingTimeInterval(-Double(offset*60))
                if let cutoff, fire >= cutoff { break }
                let stamp = format.string(from:day)
                if fire > now && done[stamp] != true {
                    list.append(Entry(id:"task."+id+"."+stamp,title:title,time:fire,voice:voice))
                    added += 1
                }
                if interval == 0 { break }
                n += interval
            }
            list.sort { $0.time < $1.time }
            if list.count > 64 { list.removeLast(list.count-64) }
        }
        return list.sorted { $0.time < $1.time }
    }

    func sync(_ snapshot: [String:Any]) async {
        nextSnapshot = snapshot
        guard !updating else { return }
        updating = true
        defer { updating = false }
        while let current = nextSnapshot {
            nextSnapshot = nil
            do { try await apply(upcoming(current)) }
            catch { report("Não foi possível programar todos os lembretes. "+error.localizedDescription) }
        }
    }

    private func apply(_ entries: [Entry]) async throws {
        let scheduled = await center.pendingNotificationRequests()
        let desired = Set(entries.map(\.id))
        center.removePendingNotificationRequests(withIdentifiers:scheduled.map(\.identifier).filter { !desired.contains($0) })
        guard !entries.isEmpty else { return }
        guard try await center.requestAuthorization(options:[.alert,.sound]) else {
            report("Ativa as notificações do Pug Planner nas Definições.")
            return
        }
        let existing = Dictionary(uniqueKeysWithValues:scheduled.map { ($0.identifier,$0.content) })
        for entry in entries {
            let signature = "\(entry.time.timeIntervalSince1970)|\(entry.title)|\(entry.voice ?? "")"
            if existing[entry.id]?.userInfo["signature"] as? String == signature { continue }
            let content = UNMutableNotificationContent()
            content.title = "Pug Planner"
            content.body = entry.title
            content.userInfo = ["signature":signature]
            var sound = "reminder_ring.wav"
            if let locale = entry.voice {
                do { sound = try await SpokenTone.name(for:entry.title,locale:locale) }
                catch { report("Voz indisponível. Será usado o toque do Pug.") }
            }
            content.sound = UNNotificationSound(named:UNNotificationSoundName(rawValue:sound))
            var cal = Calendar(identifier:.gregorian)
            cal.timeZone = .current
            let date = cal.dateComponents([.year,.month,.day,.hour,.minute,.second],from:entry.time)
            let trigger = UNCalendarNotificationTrigger(dateMatching:date,repeats:false)
            try await center.add(UNNotificationRequest(identifier:entry.id,content:content,trigger:trigger))
        }
    }
}
