//
//  TrainerTabView.swift
//  مِران
//

import SwiftUI

struct TrainerTabView: View {
    var body: some View {
        TabView {
            TrainerHomeView()
                .tabItem { Label("متدربوني", systemImage: "person.2.fill") }

            CallCenterView()
                .tabItem { Label("النداء", systemImage: "bell.badge.fill") }

            TrainerPlanView()
                .tabItem { Label("الخطة", systemImage: "list.bullet.clipboard.fill") }
        }
    }
}
