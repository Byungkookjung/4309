import AuthenticationServices
import CryptoKit
import SwiftUI

@MainActor
final class AccountConnection: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?
    func connect() async throws -> CloudCredentials {
        let privateKey = P256.KeyAgreement.PrivateKey()
        let state = UUID().uuidString
        var parameters = URLComponents()
        parameters.queryItems = [URLQueryItem(name: "state", value: state), URLQueryItem(name: "key", value: privateKey.publicKey.x963Representation.base64EncodedString())]
        let base = Bundle.main.object(forInfoDictionaryKey: "WorkConnectURL") as? String ?? "https://todo-ledger.web.app/widget-connect.html"
        var components = URLComponents(string: base)!
        components.percentEncodedFragment = parameters.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        let url = components.url!
        let callback: URL = try await withCheckedThrowingContinuation { continuation in
            session = ASWebAuthenticationSession(url: url, callbackURLScheme: "worktoday") { url, error in
                if let url { continuation.resume(returning: url) }
                else { continuation.resume(throwing: error ?? CloudError.connection) }
            }
            session?.presentationContextProvider = self
            if session?.start() != true { continuation.resume(throwing: CloudError.connection) }
        }
        session = nil
        return try Self.decrypt(callback, privateKey: privateKey, state: state)
    }
    static func decrypt(_ callback: URL, privateKey: P256.KeyAgreement.PrivateKey, state: String) throws -> CloudCredentials {
        guard callback.host == "connect", let fragment = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.percentEncodedFragment,
              let items = URLComponents(string: "https://local.invalid/?\(fragment)")?.queryItems else { throw CloudError.connection }
        func value(_ name: String) -> String? { items.first { $0.name == name }?.value }
        guard value("state") == state,
              let keyData = Data(base64Encoded: value("key") ?? ""),
              let nonce = Data(base64Encoded: value("nonce") ?? ""),
              let payload = Data(base64Encoded: value("data") ?? ""), payload.count > 16 else { throw CloudError.connection }
        let publicKey = try P256.KeyAgreement.PublicKey(x963Representation: keyData)
        let secret = try privateKey.sharedSecretFromKeyAgreement(with: publicKey)
        let key = secret.withUnsafeBytes { SymmetricKey(data: SHA256.hash(data: Data($0))) }
        let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: nonce), ciphertext: payload.dropLast(16), tag: payload.suffix(16))
        let data = try AES.GCM.open(box, using: key)
        let credentials = try JSONDecoder().decode(CloudCredentials.self, from: data)
        guard !credentials.uid.isEmpty, !credentials.refreshToken.isEmpty else { throw CloudError.connection }
        return credentials
    }
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
