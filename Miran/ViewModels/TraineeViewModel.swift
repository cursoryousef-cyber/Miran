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

            // Fetch Incoming Calls for Trainee (RBAC: /calls/my-incoming)
            let participants: APIListResponse<CallParticipantResponse> = try await APIClient.shared.request(endpoint: "/calls/my-incoming")
            // عرض أول نداء غير مؤكد الوصول
            if let first = participants.data.first(where: { $0.state != "confirmed_arrived" }) {
                self.activeCall = first.call
            } else {
                self.activeCall = nil
            }
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

    func onWay(callId: String) async {
        do {
            let _: CallParticipantModel = try await APIClient.shared.request(
                endpoint: "/calls/\(callId)/on-way",
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
                endpoint: "/calls/\(callId)/arrived",
                method: "POST"
            )
            await fetchDashboardData()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}

// MARK: - CallParticipant Response with nested call
struct CallParticipantResponse: Codable, Identifiable {
    let id: String
    let callId: String
    let traineeProfileId: String
    let state: String
    let notifiedAt: String
    let ackAt: String?
    let selfArrivedAt: String?
    let confirmedAt: String?
    let call: TrainerCallModel?
}
