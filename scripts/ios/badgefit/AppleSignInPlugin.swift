import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

/**
 * Sign in with Apple, Apple's own sheet (Face ID), inside the BadgeFit app. The server's nonce goes
 * into Apple's request hashed (SHA-256, hex); the identity token Apple hands back goes to the server
 * (POST /api/auth/apple/native), which checks it against Apple's keys. views/MobileOnboarding.jsx.
 *
 * Usage from JS:
 *   const r = await registerPlugin('AppleSignIn').signIn({ nonce })
 *   // { idToken, givenName? }; rejects with the code 'cancelled' when closed, 'failed' otherwise
 */
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
    ]
    private var pending: CAPPluginCall?
    private var controller: ASAuthorizationController?

    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("a nonce is required", "failed")
            return
        }
        let hashed = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashed
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.pending = call
            self.controller = controller
            controller.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { pending = nil; self.controller = nil }
        guard let call = pending else { return }
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = cred.identityToken, let token = String(data: data, encoding: .utf8) else {
            call.reject("Apple did not return a sign-in", "failed")
            return
        }
        var out: [String: Any] = ["idToken": token]
        if let given = cred.fullName?.givenName, !given.isEmpty { out["givenName"] = given }
        call.resolve(out)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { pending = nil; self.controller = nil }
        guard let call = pending else { return }
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        call.reject(error.localizedDescription, cancelled ? "cancelled" : "failed")
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
