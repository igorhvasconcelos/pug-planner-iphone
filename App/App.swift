import UIKit
import UserNotifications
import WebKit
import PhotosUI
import AVFoundation
import AlarmKit

@main final class AppDelegate: UIResponder, UIApplicationDelegate {}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene:scene)
        window.rootViewController = PlannerController()
        self.window = window
        window.makeKeyAndVisible()
    }
}

final class PlannerController: UIViewController, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate, PHPickerViewControllerDelegate {
    private var web: WKWebView!
    private let speech = AVSpeechSynthesizer()
    private var photoMode = "reminder"
    private var ready = false
    private let reminders = LocalReminders()
    private var interface: URL { Bundle.main.bundleURL.appendingPathComponent("Interface",isDirectory:true) }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let config = WKWebViewConfiguration()
        config.userContentController.add(self,name:"planner")
        // Keep planner data across bundle path changes on app updates.
        if let stored = UserDefaults.standard.string(forKey:"plannerData"),
           let encoded = try? JSONEncoder().encode(stored), let literal = String(data:encoded,encoding:.utf8) {
            config.userContentController.addUserScript(.init(source:"if(!localStorage.getItem('pt.pugplanner.v1'))localStorage.setItem('pt.pugplanner.v1',"+literal+");",injectionTime:.atDocumentStart,forMainFrameOnly:true))
        }
        web = WKWebView(frame:.zero,configuration:config)
        web.uiDelegate = self
        web.navigationDelegate = self
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([web.topAnchor.constraint(equalTo:safe.topAnchor),web.bottomAnchor.constraint(equalTo:safe.bottomAnchor),web.leadingAnchor.constraint(equalTo:safe.leadingAnchor),web.trailingAnchor.constraint(equalTo:safe.trailingAnchor)])
        web.loadFileURL(interface.appendingPathComponent("index.html"),allowingReadAccessTo:interface)
        reminders.report = { [weak self] s in self?.call("notice",s) }
        UNUserNotificationCenter.current().delegate = reminders
        if #available(iOS 26.0, *) { PlannerAlarms.shared.report = reminders.report }
        NotificationCenter.default.addObserver(self,selector:#selector(active),name:UIApplication.didBecomeActiveNotification,object:nil)
        NotificationCenter.default.addObserver(self,selector:#selector(active),name:UIApplication.significantTimeChangeNotification,object:nil)
    }
    @objc private func active() {
        guard ready else { return }
        web.evaluateJavaScript("tick();reschedule()")
    }
    private func call(_ name:String,_ value:String) {
        web.callAsyncJavaScript("window[fn](value)",arguments:["fn":name,"value":value],in:nil,in:.page,completionHandler:nil)
    }
    private func say(_ text:String,_ locale:String) {
        let utterance = AVSpeechUtterance(string:text)
        utterance.voice = AVSpeechSynthesisVoice(language:locale)
        speech.speak(utterance)
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true, let body = message.body as? [String:Any] else { return }
        switch body["action"] as? String {
        case "persist": if let json = body["json"] as? String { UserDefaults.standard.set(json,forKey:"plannerData") }
        case "ready": ready = true
        case "sync":
            Task {
                if #available(iOS 26.0, *) {
                    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
                    await PlannerAlarms.shared.sync(body)
                } else { await reminders.sync(body) }
            }
        case "open":
            if let s = body["url"] as? String, let url = URL(string:s), url.scheme == "https" { UIApplication.shared.open(url) }
        case "speak": say(body["text"] as? String ?? "",body["locale"] as? String ?? "pt-PT")
        case "diagnose":
            if #available(iOS 26.0, *) {
            let state = AlarmManager.shared.authorizationState
            call("notice",state == .authorized ? "Alarmes autorizados." : state == .denied ? "Permite os alarmes nas Definições do iPhone." : "O iPhone pedirá autorização ao programar o primeiro alarme.")
            } else { Task { await reminders.diagnose() } }
        case "export":
            guard let text = body["json"] as? String else { return }
            do {
                let url = FileManager.default.temporaryDirectory.appendingPathComponent("PugPlanner.json")
                try text.write(to:url,atomically:true,encoding:.utf8)
                let vc = UIActivityViewController(activityItems:[url],applicationActivities:nil)
                vc.popoverPresentationController?.sourceView = view
                present(vc,animated:true)
            } catch { call("notice",error.localizedDescription) }
        case "photo":
            photoMode = body["mode"] as? String ?? "reminder"
            if body["camera"] as? Bool == true {
                guard UIImagePickerController.isSourceTypeAvailable(.camera) else { call("notice","Câmara indisponível."); return }
                let picker = UIImagePickerController()
                picker.sourceType = .camera
                picker.delegate = self
                present(picker,animated:true)
            } else {
                var config = PHPickerConfiguration()
                config.filter = .images
                let picker = PHPickerViewController(configuration:config)
                picker.delegate = self
                present(picker,animated:true)
            }
        default: break
        }
    }
    private func recognize(_ bytes: Data?) {
        guard let bytes else { call("notice","Não foi possível abrir a imagem."); return }
        Task {
            do {
                let mode = photoMode
                let result = try await Task.detached { try PlannerMedia.process(bytes, mode: mode) }.value
                if mode == "reminder" {
                    call("recognized",result)
                } else {
                    web.callAsyncJavaScript("window.mediaResult(mode, result)",arguments:["mode":mode,"result":result],in:nil,in:.page,completionHandler:nil)
                }
            }
            catch { call("notice",error.localizedDescription) }
        }
    }
    func picker(_ picker: PHPickerViewController, didFinishPicking results:[PHPickerResult]) {
        picker.dismiss(animated:true)
        results.first?.itemProvider.loadDataRepresentation(forTypeIdentifier:"public.image") { data,_ in DispatchQueue.main.async { self.recognize(data) } }
    }
    func imagePickerControllerDidCancel(_ picker:UIImagePickerController) { picker.dismiss(animated:true) }
    func imagePickerController(_ picker:UIImagePickerController,didFinishPickingMediaWithInfo info:[UIImagePickerController.InfoKey:Any]) {
        picker.dismiss(animated:true)
        recognize((info[.originalImage] as? UIImage)?.jpegData(compressionQuality:0.9))
    }
    func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping (WKNavigationActionPolicy)->Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        decisionHandler(url.isFileURL && url.standardizedFileURL.path == interface.appendingPathComponent("index.html").standardizedFileURL.path ? .allow : .cancel)
    }
    func webView(_ webView:WKWebView,runJavaScriptAlertPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping ()->Void) {
        let a = UIAlertController(title:"Pug Planner",message:message,preferredStyle:.alert)
        a.addAction(UIAlertAction(title:"OK",style:.default){ _ in completionHandler() })
        present(a,animated:true)
    }
    func webView(_ webView:WKWebView,runJavaScriptConfirmPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping (Bool)->Void) {
        let a = UIAlertController(title:"Pug Planner",message:message,preferredStyle:.alert)
        a.addAction(UIAlertAction(title:"Cancelar",style:.cancel){ _ in completionHandler(false) })
        a.addAction(UIAlertAction(title:"Confirmar",style:.default){ _ in completionHandler(true) })
        present(a,animated:true)
    }
}
