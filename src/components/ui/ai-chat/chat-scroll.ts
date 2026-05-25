function isVisibleChatElement(element: HTMLElement | null): element is HTMLElement {
    if (!element) return false;

    if (typeof window !== "undefined" && window.getComputedStyle) {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") {
            return false;
        }
    }

    return (
        element.getClientRects().length > 0 ||
        element.offsetHeight > 0 ||
        element.offsetWidth > 0
    );
}

export function getActiveChatScrollElement(
    mobileElement: HTMLElement | null,
    desktopRootElement: HTMLElement | null
): HTMLElement | null {
    if (isVisibleChatElement(mobileElement)) {
        return mobileElement;
    }

    const desktopViewport = desktopRootElement?.querySelector(
        "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null | undefined;

    if (isVisibleChatElement(desktopViewport ?? null)) {
        return desktopViewport ?? null;
    }

    return isVisibleChatElement(desktopRootElement) ? desktopRootElement : null;
}
