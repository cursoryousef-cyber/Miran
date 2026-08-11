//
//  OrgSwitcherSheet.swift
//  Miran
//
//  Sheet allowing user to switch their active Organization Context dynamically.
//

import SwiftUI

struct OrgSwitcherSheet: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                MiranTheme.background
                    .ignoresSafeArea()

                VStack(alignment: .leading, spacing: 20) {
                    Text("اختر الجهة للعمل بها:")
                        .font(.headline)
                        .foregroundColor(MiranTheme.subtext)
                        .padding(.top)

                    ScrollView {
                        VStack(spacing: 12) {
                            if let orgs = authViewModel.currentUser?.availableOrganizations {
                                ForEach(orgs, id: \.id) { org in
                                    Button {
                                        Task {
                                            await authViewModel.switchOrganization(orgId: org.id)
                                            dismiss()
                                        }
                                    } label: {
                                        HStack {
                                            Image(systemName: "building.2.crop.circle.fill")
                                                .font(.title2)
                                                .foregroundColor(org.id == authViewModel.currentUser?.activeOrganization.id ? MiranTheme.emerald : MiranTheme.subtext)

                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(org.displayName)
                                                    .font(.body.weight(.bold))
                                                    .foregroundColor(.white)
                                                if let en = org.nameEn {
                                                    Text(en)
                                                        .font(.caption)
                                                        .foregroundColor(MiranTheme.subtext)
                                                }
                                            }

                                            Spacer()

                                            if org.id == authViewModel.currentUser?.activeOrganization.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(MiranTheme.emerald)
                                            }
                                        }
                                        .padding()
                                        .background(org.id == authViewModel.currentUser?.activeOrganization.id ? MiranTheme.emerald.opacity(0.15) : Color.white.opacity(0.04))
                                        .cornerRadius(14)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(org.id == authViewModel.currentUser?.activeOrganization.id ? MiranTheme.emerald.opacity(0.4) : Color.white.opacity(0.08), lineWidth: 1)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("تبديل سياق الجهة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") {
                        dismiss()
                    }
                }
            }
        }
    }
}
