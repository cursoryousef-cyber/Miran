//
//  LoginView.swift
//  Miran
//
//  SwiftUI Login View for iOS connecting to Miran REST Auth API.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = "admin@miran.health"
    @State private var password = "Miran@Admin2024!"
    @State private var mfaCode = ""
    @State private var showOrgPicker = false

    var body: some View {
        ZStack {
            MiranTheme.background
                .ignoresSafeArea()

            // Background Glowing Circles
            Circle()
                .fill(MiranTheme.emerald.opacity(0.15))
                .blur(radius: 60)
                .frame(width: 300, height: 300)
                .offset(x: 120, y: -200)

            Circle()
                .fill(MiranTheme.accent.opacity(0.12))
                .blur(radius: 60)
                .frame(width: 300, height: 300)
                .offset(x: -120, y: 200)

            VStack(spacing: 24) {
                Spacer()

                // Brand Icon
                VStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(LinearGradient(
                                colors: [MiranTheme.emerald, MiranTheme.teal],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .frame(width: 72, height: 72)
                            .shadow(color: MiranTheme.emerald.opacity(0.4), radius: 12, y: 6)

                        Text("مِ")
                            .font(.system(size: 38, weight: .black))
                            .foregroundColor(.white)
                    }

                    Text("مِران (Miran)")
                        .font(.title.weight(.bold))
                        .foregroundColor(.white)

                    Text("المنصة الوطنية لإدارة التدريب الصحي")
                        .font(.subheadline)
                        .foregroundColor(MiranTheme.subtext)
                }

                // Error Banner
                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.red)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.15))
                        .cornerRadius(12)
                }

                // Login Card
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("البريد الإلكتروني")
                            .font(.caption)
                            .foregroundColor(MiranTheme.subtext)

                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(MiranTheme.subtext)
                            TextField("البريد الإلكتروني", text: $email)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("كلمة المرور")
                            .font(.caption)
                            .foregroundColor(MiranTheme.subtext)

                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundColor(MiranTheme.subtext)
                            SecureField("كلمة المرور", text: $password)
                                .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.white.opacity(0.06))
                        .cornerRadius(12)
                    }

                    Button {
                        Task {
                            await authViewModel.login(email: email, password: password, mfaCode: mfaCode.isEmpty ? nil : mfaCode)
                        }
                    } label: {
                        HStack {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("تسجيل الدخول")
                                    .font(.headline.weight(.bold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(LinearGradient(
                            colors: [MiranTheme.emerald, MiranTheme.teal],
                            startPoint: .leading,
                            endPoint: .trailing
                        ))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .shadow(color: MiranTheme.emerald.opacity(0.3), radius: 8, y: 4)
                    }
                    .disabled(authViewModel.isLoading)
                }
                .padding(24)
                .background(Color.white.opacity(0.04))
                .cornerRadius(24)
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

                Spacer()

                Text("الإصدار المؤسسي v3.0 — iOS App")
                    .font(.caption2)
                    .foregroundColor(MiranTheme.subtext)
            }
            .padding(24)
        }
    }
}
