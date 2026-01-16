/**
 * Feed Skeleton Loader
 * Loading placeholder for feed posts
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

export function FeedSkeleton() {
    return (
        <View style={styles.container}>
            {[1, 2, 3].map((index) => (
                <View key={index} style={styles.postSkeleton}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.avatar} />
                        <View style={styles.headerInfo}>
                            <View style={[styles.line, styles.nameLine]} />
                            <View style={[styles.line, styles.timeLine]} />
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <View style={[styles.line, styles.contentLine1]} />
                        <View style={[styles.line, styles.contentLine2]} />
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <View style={styles.actionButton} />
                        <View style={styles.actionButton} />
                        <View style={styles.actionButton} />
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: THEME.spacing.md,
    },
    postSkeleton: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    header: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
    },
    headerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    line: {
        height: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 6,
    },
    nameLine: {
        width: '40%',
        marginBottom: 6,
    },
    timeLine: {
        width: '25%',
    },
    content: {
        marginBottom: 12,
    },
    contentLine1: {
        width: '100%',
        marginBottom: 6,
    },
    contentLine2: {
        width: '70%',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        width: 60,
        height: 24,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
    },
});
