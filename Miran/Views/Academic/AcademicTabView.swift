//
//  AcademicTabView.swift
//  مِران
//

import SwiftUI

struct AcademicTabView: View {
    var body: some View {
        TabView {
            ApplicationsReviewView()
                .tabItem { Label("الملفات", systemImage: "tray.full.fill") }

            AssignmentView()
                .tabItem { Label("الإسناد", systemImage: "arrow.triangle.branch") }

            ReportsView()
                .tabItem { Label("التقارير", systemImage: "chart.bar.fill") }

            RiskView()
                .tabItem { Label("الإنذار المبكر", systemImage: "exclamationmark.triangle.fill") }
        }
    }
}
