//
//  TrainerViewModel.swift
//  Miran
//
//  ViewModel for Trainer domain data: Launch Quick Calls, View Trainees, Submit Evaluations.
//

import Foundation

@MainActor
final class TrainerViewModel: ObservableObject {
    @Published var trainerProfile: TrainerProfileModel?
    @Published var activeCalls: [TrainerCallModel] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func fetchTrainerData() async {
        isLoading = true
        errorMessage = nil

        do {
            let profile: TrainerProfileModel = try await APIClient.shared.request(endpoint: "/trainers/me")
            self.trainerProfile = profile

            let calls: APIListResponse<TrainerCallModel> = try await APIClient.shared.request(endpoint: "/calls/active")
            self.activeCalls = calls.data
        } catch {
            self.errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func launchCall(callType: String, customTitle: String?, note: String?, location: String?, expectedMinutes: Int) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            let req = LaunchCallRequest(
                callType: callType,
                customTitle: customTitle,
                note: note,
                location: location,
                expectedMinutes: expectedMinutes
            )

            let _: TrainerCallModel = try await APIClient.shared.request(
                endpoint: "/calls/launch",
                method: "POST",
                body: req
            )

            await fetchTrainerData()
            isLoading = false
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
}
