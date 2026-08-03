//
//  TraineeViewModel.swift
//  Miran
//
//  ViewModel for Trainee domain data: Profile, Active Rotations, Attendance, Calls.
//

import Foundation

@MainActor
final class TraineeViewModel: ObservableObject {
    @Published var traineeProfile: TraineeProfileModel?
    @Published var rotations: [RotationModel] = []
    @Published var activeCall: TrainerCallModel?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    func fetchDashboardData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch Trainee Profile
            let profile: TraineeProfileModel = try await APIClient.shared.request(endpoint: "/trainees/me")
            self.traineeProfile = profile

            // Fetch Rotations
            let rotList: APIListResponse<RotationModel> = try await APIClient.shared.request(endpoint: "/rotations/my")
            self.rotations = rotList.data

            // Fetch Active Calls
            let calls: APIListResponse<TrainerCallModel> = try await APIClient.shared.request(endpoint: "/calls/active")
            self.activeCall = calls.data.first
        } catch {
            self.errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func acknowledgeCall(callId: String) async {
        do {
            let _: CallParticipantModel = try await APIClient.shared.request(
                endpoint: "/calls/\(callId)/ack",
                method: "POST"
            )
            await fetchDashboardData()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }

    func confirmArrival(callId: String) async {
        do {
            let _: CallParticipantModel = try await APIClient.shared.request(
                endpoint: "/calls/\(callId)/self-arrive",
                method: "POST"
            )
            await fetchDashboardData()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}
