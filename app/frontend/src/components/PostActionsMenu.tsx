import React, { Fragment, useState } from 'react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import {
    MoreVertical,
    Edit,
    Trash2,
    Pin,
    PinOff,
    Share2,
    Flag,
    EyeOff
} from 'lucide-react';

export interface PostActionPermissions {
    canEdit: boolean;
    canDelete: boolean;
    canPin: boolean;
    canReport: boolean;
    canHide: boolean;
}

export interface PostActionsMenuProps {
    postId: string;
    isPinned: boolean;
    permissions: PostActionPermissions;
    onEdit?: () => void;
    onDelete?: () => void;
    onPin?: () => void;
    onUnpin?: () => void;
    onShare?: () => void;
    onReport?: () => void;
    onHide?: () => void;
}

export default function PostActionsMenu({
    postId,
    isPinned,
    permissions,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onShare,
    onReport,
    onHide
}: PostActionsMenuProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        setShowDeleteConfirm(false);
        onDelete?.();
    };

    return (
        <>
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Post actions"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Menu.Button>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-gray-100 dark:divide-gray-700">
                        <div className="py-1">
                            {permissions.canEdit && onEdit && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit();
                                            }}
                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <Edit className="mr-3 h-4 w-4" aria-hidden="true" />
                                            Edit post
                                        </button>
                                    )}
                                </Menu.Item>
                            )}

                            {permissions.canPin && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                isPinned ? onUnpin?.() : onPin?.();
                                            }}
                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            {isPinned ? (
                                                <>
                                                    <PinOff className="mr-3 h-4 w-4" aria-hidden="true" />
                                                    Unpin post
                                                </>
                                            ) : (
                                                <>
                                                    <Pin className="mr-3 h-4 w-4" aria-hidden="true" />
                                                    Pin post
                                                </>
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                            )}
                        </div>

                        <div className="py-1">
                            {onShare && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onShare();
                                            }}
                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <Share2 className="mr-3 h-4 w-4" aria-hidden="true" />
                                            Share post
                                        </button>
                                    )}
                                </Menu.Item>
                            )}

                            {permissions.canReport && onReport && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReport();
                                            }}
                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <Flag className="mr-3 h-4 w-4" aria-hidden="true" />
                                            Report post
                                        </button>
                                    )}
                                </Menu.Item>
                            )}

                            {permissions.canHide && onHide && (
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onHide();
                                            }}
                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                        >
                                            <EyeOff className="mr-3 h-4 w-4" aria-hidden="true" />
                                            Hide post
                                        </button>
                                    )}
                                </Menu.Item>
                            )}
                        </div>

                        {permissions.canDelete && onDelete && (
                            <div className="py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick();
                                            }}
                                            className={`${active ? 'bg-red-50 dark:bg-red-900/20' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                                        >
                                            <Trash2 className="mr-3 h-4 w-4" aria-hidden="true" />
                                            Delete post
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        )}
                    </Menu.Items>
                </Transition>
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Transition appear show={showDeleteConfirm} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setShowDeleteConfirm(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                                    >
                                        Delete post?
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Are you sure you want to delete this post? This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="mt-4 flex space-x-3 justify-end">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={handleConfirmDelete}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
