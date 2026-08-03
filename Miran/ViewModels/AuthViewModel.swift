//
//  AuthViewModel.swift
//  Miran
//
//  Main Authentication & Session ViewModel for iOS.
//  Manages login, JWT persistence, active organization context, and user profile state.
//

import Foundation
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var currentUser: UserProfileResponse?
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    init() {
        checkSavedSession()
    }

    func checkSavedSession() {
        if let token = KeychainService.shared.get(forKey: "access_token"), !token.isEmpty {
            self.isAuthenticated = true
            // Load saved user profile if cached
            if let profileData = KeychainService.shared.get(forKey: "user_profile")?.data(using: .utf8),
               let profile = try? JSONDecoder().decode(UserProfileResponse.self, from: profileData) {
                self.currentUser = profile
            }
        } else {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }

    func login(email: String, password: String, mfaCode: String? = nil) async {
        isLoading = true
        errorMessage = nil

        do {
            let req = LoginRequest(email: email.lowercased(), password: password, mfaCode: mfaCode)

            let response: LoginResponse = try await APIClient.shared.request(
                endpoint: "/auth/login",
                method: "POST",
                body: req,
                requiresAuth: false
            )

            // Save to Keychain
            KeychainService.shared.save(response.tokens.accessToken, forKey: "access_token")
            KeychainService.shared.save(response.tokens.refreshToken, forKey: "refresh_token")
            KeychainService.shared.save(response.user.activeOrganization.id, forKey: "active_org_id")

            if let profileData = try? JSONEncoder().encode(response.user),
               let profileStr = String(data: profileData, encoding: .utf8) {
                KeychainService.shared.save(profileStr, forKey: "user_profile")
            }

            self.currentUser = response.user
            self.isAuthenticated = true
        } catch {
            self.errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func switchOrganization(orgId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let req = SwitchOrgRequest(organizationId: orgId)

            let response: SwitchOrgResponse = try await APIClient.shared.request(
                endpoint: "/auth/switch-org",
                method: "POST",
                body: req
            )

            // Update Tokens & Active Org in Keychain
            KeychainService.shared.save(response.tokens.accessToken, forKey: "access_token")
            KeychainService.shared.save(response.tokens.refreshToken, forKey: "refresh_token")
            KeychainService.shared.save(response.activeOrganization.id, forKey: "active_org_id")

            if var user = self.currentUser {
                user = UserProfileResponse(
                    id: user.id,
                    personId: user.personId,
                    nameAr: user.nameAr,
                    nameEn: user.nameEn,
                    email: user.email,
                    activeOrganization: response.activeOrganization,
                    availableOrganizations: user.availableOrganizations
                )
                self.currentUser = user

                if let profileData = try? JSONEncoder().encode(user),
                   let profileStr = String(data: profileData, encoding: .utf8) {
                    KeychainService.shared.save(profileStr, forKey: "user_profile")
                }
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func logout() {
        KeychainService.shared.clearAll()
        self.currentUser = nil
        self.isAuthenticated = false
    }
}

private struct SwitchOrgResponse: Codable {
    let activeOrganization: UserOrgResponse
    let tokens: TokenPair
}
