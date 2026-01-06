import React, { useState } from 'react';
import styles from './GiftOptions.module.css';

interface GiftOptionsProps {
    isGift: boolean;
    giftMessage?: string;
    giftWrapOption?: 'standard' | 'premium' | 'none';
    onUpdate: (options: {
        isGift: boolean;
        giftMessage?: string;
        giftWrapOption?: 'standard' | 'premium' | 'none';
    }) => void;
}

export const GiftOptions: React.FC<GiftOptionsProps> = ({
    isGift,
    giftMessage = '',
    giftWrapOption = 'none',
    onUpdate
}) => {
    const [expanded, setExpanded] = useState(isGift);
    const [localMessage, setLocalMessage] = useState(giftMessage);
    const [localWrapOption, setLocalWrapOption] = useState(giftWrapOption);

    const handleGiftToggle = (checked: boolean) => {
        setExpanded(checked);
        if (!checked) {
            // Reset gift options when unchecked
            setLocalMessage('');
            setLocalWrapOption('none');
            onUpdate({
                isGift: false,
                giftMessage: '',
                giftWrapOption: 'none'
            });
        } else {
            onUpdate({
                isGift: true,
                giftMessage: localMessage,
                giftWrapOption: localWrapOption
            });
        }
    };

    const handleMessageChange = (message: string) => {
        setLocalMessage(message);
        onUpdate({
            isGift: true,
            giftMessage: message,
            giftWrapOption: localWrapOption
        });
    };

    const handleWrapOptionChange = (option: 'standard' | 'premium' | 'none') => {
        setLocalWrapOption(option);
        onUpdate({
            isGift: true,
            giftMessage: localMessage,
            giftWrapOption: option
        });
    };

    return (
        <div className={styles.giftOptions}>
            <label className={styles.giftCheckbox}>
                <input
                    type="checkbox"
                    checked={expanded}
                    onChange={(e) => handleGiftToggle(e.target.checked)}
                />
                <span>This is a gift</span>
            </label>

            {expanded && (
                <div className={styles.giftDetails}>
                    <div className={styles.giftWrapSection}>
                        <label className={styles.sectionLabel}>Gift wrap:</label>
                        <div className={styles.wrapOptions}>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="giftWrap"
                                    value="none"
                                    checked={localWrapOption === 'none'}
                                    onChange={() => handleWrapOptionChange('none')}
                                />
                                <span>No gift wrap</span>
                            </label>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="giftWrap"
                                    value="standard"
                                    checked={localWrapOption === 'standard'}
                                    onChange={() => handleWrapOptionChange('standard')}
                                />
                                <span>Standard wrap (+$2.99)</span>
                            </label>
                            <label className={styles.radioOption}>
                                <input
                                    type="radio"
                                    name="giftWrap"
                                    value="premium"
                                    checked={localWrapOption === 'premium'}
                                    onChange={() => handleWrapOptionChange('premium')}
                                />
                                <span>Premium wrap (+$5.99)</span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.giftMessageSection}>
                        <label className={styles.sectionLabel} htmlFor="giftMessage">
                            Gift message (optional):
                        </label>
                        <textarea
                            id="giftMessage"
                            className={styles.giftMessageInput}
                            value={localMessage}
                            onChange={(e) => handleMessageChange(e.target.value)}
                            maxLength={200}
                            placeholder="Add a personal message..."
                            rows={3}
                        />
                        <div className={styles.charCount}>
                            {localMessage.length}/200 characters
                        </div>
                    </div>

                    <div className={styles.giftPreview}>
                        <div className={styles.previewLabel}>Preview:</div>
                        <div className={styles.giftCard}>
                            <div className={styles.giftCardIcon}>🎁</div>
                            <div className={styles.giftCardMessage}>
                                {localMessage || 'Your gift message will appear here'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
