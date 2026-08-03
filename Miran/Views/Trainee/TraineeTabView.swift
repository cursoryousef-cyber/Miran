//
//  TraineeTabView.swift
//  مِران
//

import SwiftUI

struct TraineeTabView: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("اليوم", systemImage: "sun.max.fill") }

            ScheduleView()
                .tabItem { Label("جدولي", systemImage: "calendar") }

            RotationPassportView()
                .tabItem { Label("القسم", systemImage: "map.fill") }

            TraineeProfileView()
                .tabItem { Label("ملفي", systemImage: "person.crop.square.fill") }
        }
        .overlay(alignment: .top) {
            // النداء الوارد يعلو كل شيء
            if let traineeID = store.currentTraineeID,
               let call = store.activeCalls(for: traineeID).first {
                IncomingCallBanner(call: call)
                    .padding(.horizontal, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35), value: store.calls.count)
    }
}
