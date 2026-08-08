//
//  TraineeTabView.swift
//  Miran
//
//  SwiftUI Trainee Tab View connected to Miran REST APIs (Async/Await & TraineeViewModel).
//

import SwiftUI

struct TraineeTabView: View {
    var body: some View {
        TabView {
            TraineeDashboardFullView()
                .tabItem { Label("الرئيسية", systemImage: "house.fill") }
            ScheduleView()
                .tabItem { Label("جدولي", systemImage: "calendar") }
            TodayView()
                .tabItem { Label("اليوم", systemImage: "checkmark.circle") }
        }
    }
}
