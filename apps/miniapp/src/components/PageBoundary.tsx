import { Component, type ReactNode } from "react";
import { ErrorState } from "./states";

interface Props {
  /** Sahifa manzili: boshqa sahifaga o'tilganda xato holati tozalanadi */
  resetKey: string;
  children: ReactNode;
}
interface State {
  failed: boolean;
  key: string;
}

/**
 * T-135: sahifa render paytida yoki lazy chunk yuklanmay qolsa butun ilova oq ekran bo'lmaydi:
 * menyu joyida qoladi, sahifa o'rnida xabar va qayta yuklash tugmasi. Xato chunk brauzerda
 * keshlanib qolishi mumkin, shuning uchun "Qayta urinish" sahifani to'liq qayta yuklaydi.
 */
export class PageBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Sahifa xatosi", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert">
        <ErrorState
          message="Sahifani ochib boʻlmadi. Internet aloqasini tekshirib, qayta urinib koʻring."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }
}
