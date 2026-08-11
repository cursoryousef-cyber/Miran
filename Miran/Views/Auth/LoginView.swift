//
//  LoginView.swift
//  Miran
//
//  SwiftUI Production Login View connected directly to Miran REST Auth API (/auth/login).
//  Fetches user profile, active organization context, and primary role from database.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var mfaCode = ""

    var body: some View {
        ZStack {
            MiranTheme.background
                .ignoresSafeArea()

            // Background Glowing Ambient Circles
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

            ScrollView {
                VStack(spacing: 24) {
                    Spacer(minLength: 40)

                    // Brand Identity
                    VStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 22)
                                .fill(LinearGradient(
                                    colors: [MiranTheme.emerald, MiranTheme.teal],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                                .frame(width: 80, height: 80)
                                .shadow(color: MiranTheme.emerald.opacity(0.4), radius: 14, y: 6)

                            Text("مِ")
                                .font(.system(size: 42, weight: .black))
                                .foregroundColor(.white)
                        }

                        Text("مِران (Miran)")
                            .font(.title.weight(.bold))
                            .foregroundColor(.white)

                        Text("منصة التدريب الصحية الالكترونية")
                            .font(.subheadline)
                            .foregroundColor(MiranTheme.subtext)
                    }

                    // Error Notification Banner
                    if let error = authViewModel.errorMessage {
                        HStack(spacing: 10) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.red)
                                .multilineTextAlignment(.leading)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.12))
                        .cornerRadius(14)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Color.red.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal, 4)
                    }

                    // Production Credentials Card
                    VStack(spacing: 18) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("البريد الإلكتروني المؤسسي")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.white)

                            HStack {
                                Image(systemName: "envelope.fill")
                                    .foregroundColor(MiranTheme.emerald)
                                TextField("name@miran.health", text: $email)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .foregroundColor(.white)
                            }
                            .padding()
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
                            )
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("كلمة المرور")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.white)

                            HStack {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(MiranTheme.emerald)
                                SecureField("••••••••••••", text: $password)
                                    .foregroundColor(.white)
                            }
                            .padding()
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
                            )
                        }

                        // Submit Button
                        Button {
                            Task {
                                await authViewModel.login(
                                    email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                                    password: password,
                                    mfaCode: mfaCode.isEmpty ? nil : mfaCode
                                )
                            }
                        } label: {
                            HStack(spacing: 8) {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("تسجيل الدخول إلى حسابك")
                                        .font(.headline.weight(.bold))
                                    Image(systemName: "arrow.left.circle.fill")
                                        .font(.title3)
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
                            .cornerRadius(14)
                            .shadow(color: MiranTheme.emerald.opacity(0.35), radius: 10, y: 4)
                        }
                        .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)
                        .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)
                    }
                    .padding(24)
                    .background(Color.white.opacity(0.04))
                    .cornerRadius(24)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )

                    Spacer(minLength: 40)

                    Text("جميع الحقوق محفوظة د. فواز جمال الديدب 2026")
                        .font(.caption2)
                        .foregroundColor(MiranTheme.subtext)
                        .multilineTextAlignment(.center)
                }
                .padding(20)
            }
        }
    }
}
