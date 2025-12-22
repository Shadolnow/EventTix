import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native'
import { QRScanner } from '../src/components/QRScanner'
import { BiometricAuth } from '../src/utils/biometricAuth'

export default function ScannerScreen() {
    const [showScanner, setShowScanner] = useState(false)
    const [scannedData, setScannedData] = useState<string | null>(null)

    const handleScanPress = async () => {
        // Require biometric auth before scanning
        const authenticated = await BiometricAuth.authenticateForScan()

        if (authenticated) {
            setShowScanner(true)
        } else {
            Alert.alert('Authentication Failed', 'Biometric authentication is required to scan tickets')
        }
    }

    const handleScan = (code: string) => {
        setScannedData(code)
        setShowScanner(false)

        // Here you would typically:
        // 1. Parse the QR code
        // 2. Validate ticket against local DB or API
        // 3. Update check-in status
        Alert.alert('Ticket Scanned', `Code: ${code}`)
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Scanner</Text>
                <Text style={styles.subtitle}>Scan ticket QR codes</Text>
            </View>

            <View style={styles.content}>
                <Pressable
                    style={styles.scanButton}
                    onPress={handleScanPress}
                >
                    <Text style={styles.scanButtonText}>📱 Open Scanner</Text>
                </Pressable>

                {scannedData && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Last Scanned:</Text>
                        <Text style={styles.resultData}>{scannedData}</Text>
                    </View>
                )}
            </View>

            <Modal
                visible={showScanner}
                animationType="slide"
                presentationStyle="fullScreen"
            >
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F1C',
    },
    header: {
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#00D9FF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#8B9DC3',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanButton: {
        backgroundColor: '#00D9FF',
        paddingVertical: 18,
        paddingHorizontal: 48,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#00D9FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    scanButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#0A0F1C',
    },
    resultBox: {
        marginTop: 32,
        padding: 20,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        width: '100%',
    },
    resultLabel: {
        fontSize: 14,
        color: '#8B9DC3',
        marginBottom: 8,
    },
    resultData: {
        fontSize: 16,
        color: '#fff',
        fontFamily: 'monospace',
    },
})
