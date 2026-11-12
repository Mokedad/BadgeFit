import Foundation
import Capacitor
import AuthenticationServices

/**
 * BadgeFit's sign-in sheet (views/MobileOnboarding.jsx): the website's link page shown over the
 * app in the system's own sign-in sheet (ASWebAuthenticationSession), which closes by itself when
 * the page opens a badgefit:// link and hands that link back. Google and Apple only sign people
 * in from such a sheet, not from an app's own web view.
 *
 * Usage from JS:
 *   const WebAuth = registerPlugin('WebAuth');
 *   const { url } = await WebAuth.start({ url: 'https://…/#/link-app', scheme: 'badgefit' });
 *   // rejects with the code 'cancelled' when the sheet was closed, 'failed' otherwise
 */
@objc(WebAuthPlugin)
public class WebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "WebAuthPlugin"
    public let jsName = "WebAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
    ]
    private var session: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw), let scheme = call.getString("scheme") else {
            call.reject("url and scheme are required", "failed")
            return
        }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callback, error in
                self?.session = nil
                if let callback = callback {
                    call.resolve(["url": callback.absoluteString])
                    return
                }
                let cancelled = (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                call.reject(error?.localizedDescription ?? "the sign-in did not finish", cancelled ? "cancelled" : "failed")
            }
            session.presentationContextProvider = self
            // Safari's own cookies: someone already signed in on the website is not asked again.
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("the sign-in sheet could not open", "failed")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
