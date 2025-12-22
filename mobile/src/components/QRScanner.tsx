import React, { useState, useCallback } from 'react'
import { StyleSheet, Text, View, Pressable, Vibration } from 'react-native'
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera'
import { runOnJS } from 'react-native-reanimated'

interface QRScannerProps {
    onScan: (code: string) => void
    onClose: () => void
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const [hasPermission, setHasPermission] = useState(false)
    const [isScanning, setIsScanning] = useState(true)
    const device = useCameraDevice('back')

    React.useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission()
            setHasPermission(status === 'granted')
        })()
    }, [])

    const handleCodeScanned = useCallback((codes: any[]) => {
        if (!isScanning || codes.length === 0) return

        const code = codes[0]
        if (code?.value) {
            setIsScanning(false)
            Vibration.vibrate(100) // Haptic feedback
            runOnJS(onScan)(code.value)
        }
    }, [isScanning, onScan])

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: handleCodeScanned,
    })

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera permission required</Text>
            </View>
        )
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No camera device found</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                codeScanner={codeScanner}
            />

            {/* Scan Frame Overlay */}
            <View style={styles.overlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.instruction}>Align QR code within frame</Text>
            </View>

            {/* Close Button */}
            <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: '#00D9FF',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    instruction: {
        marginTop: 20,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
})
