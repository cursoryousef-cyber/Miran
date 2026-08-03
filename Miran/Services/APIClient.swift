//
//  APIClient.swift
//  Miran
//
//  Production-ready REST API Networking Client with Async/Await,
//  JWT token injection, Multi-Org header switching, and 401 refresh token rotation.
//

import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse(statusCode: Int)
    case decodingError(Error)
    case serverError(message: String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "الرابط غير صالح"
        case .invalidResponse(let code):
            return "استجابة غير صالحة من الخادم (رمز: \(code))"
        case .decodingError(let err):
            return "خطأ في قراءة البيانات: \(err.localizedDescription)"
        case .serverError(let msg):
            return msg
        case .unauthorized:
            return "غير مصرح بالدخول — انتهت صلاحية الجلسة"
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    var baseURL = "https://fawaz-backend-abx3.onrender.com/api/v1"

    private let session = URLSession.shared

    // MARK: - Generic Request Method
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        let cleanEndpoint = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        guard let url = URL(string: "\(baseURL)\(cleanEndpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Inject Auth & Org Context Headers
        if requiresAuth {
            if let token = KeychainService.shared.get(forKey: "access_token") {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let orgId = KeychainService.shared.get(forKey: "active_org_id") {
                request.setValue(orgId, forHTTPHeaderField: "X-Organization-Id")
            }
        }

        // Encode HTTP Body
        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse(statusCode: 0)
        }

        // Handle 401 Unauthorized (Attempt Refresh)
        if httpResponse.statusCode == 401 && requiresAuth {
            let refreshed = await attemptTokenRefresh()
            if refreshed {
                return try await self.request(endpoint: endpoint, method: method, body: body, requiresAuth: requiresAuth)
            } else {
                throw APIError.unauthorized
            }
        }

        // Handle Success
        if (200...299).contains(httpResponse.statusCode) {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .useDefaultKeys
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        }

        // Handle Error JSON Response
        if let errorObj = try? JSONDecoder().decode(ServerErrorResponse.self, from: data) {
            throw APIError.serverError(message: errorObj.message ?? "حدث خطأ غير متوقع")
        }

        throw APIError.invalidResponse(statusCode: httpResponse.statusCode)
    }

    // MARK: - Token Refresh
    private func attemptTokenRefresh() async -> Bool {
        guard let refreshToken = KeychainService.shared.get(forKey: "refresh_token") else {
            return false
        }

        guard let url = URL(string: "\(baseURL)/auth/refresh-token") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["refreshToken": refreshToken]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await session.data(for: req)
            guard let httpResp = resp as? HTTPURLResponse, httpResp.statusCode == 200 else {
                return false
            }

            let pair = try JSONDecoder().decode(TokenPair.self, from: data)
            KeychainService.shared.save(pair.accessToken, forKey: "access_token")
            KeychainService.shared.save(pair.refreshToken, forKey: "refresh_token")
            return true
        } catch {
            return false
        }
    }
}

private struct ServerErrorResponse: Decodable {
    let message: String?
}
