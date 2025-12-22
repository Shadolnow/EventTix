import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'

export interface BiometricResult {
    success: boolean
    biometryType?: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris'
    error?: string
}

export class BiometricAuth {
    static async isAvailable(): Promise<boolean> {
        const compatible = await LocalAuthentication.hasHardwareAsync()
        if (!compatible) return false

        const enrolled = await LocalAuthentication.isEnrolledAsync()
        return enrolled
    }

    static async getSupportedTypes(): Promise<string[]> {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
        return types.map(type => {
            switch (type) {
                case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                    return Platform.OS === 'ios' ? 'FaceID' : 'Face Recognition'
                case LocalAuthentication.AuthenticationType.FINGERPRINT:
                    return Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint'
                case LocalAuthentication.AuthenticationType.IRIS:
                    return 'Iris'
                default:
                    return 'Biometric'
            }
        })
    }

    static async authenticate(
        promptMessage = 'Authenticate to continue'
    ): Promise<BiometricResult> {
        try {
            const available = await this.isAvailable()

            if (!available) {
                return {
                    success: false,
                    error: 'Biometric authentication not available or not enrolled',
                }
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                fallbackLabel: 'Use passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            })

            if (result.success) {
                const types = await this.getSupportedTypes()
                return {
                    success: true,
                    biometryType: types[0] as any,
                }
            } else {
                return {
                    success: false,
                    error: result.error || 'Authentication failed',
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    static async authenticateForTicket(ticketCode: string): Promise<boolean> {
        const result = await this.authenticate('Verify your identity to view ticket')
        return result.success
    }

    static async authenticateForScan(): Promise<boolean> {
        const result = await this.authenticate('Authenticate to scan tickets')
        return result.success
    }
}
