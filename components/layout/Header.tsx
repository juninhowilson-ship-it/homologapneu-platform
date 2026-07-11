import Logo from "./Logo";

export default function Header() {

    return (

        <header className="h-16 bg-header flex items-center justify-between px-8 shadow">

            <Logo />

            <div className="flex items-center gap-6 text-white">

                <button aria-label="Notificações" type="button">
                    🔔
                </button>

                <button aria-label="Configurações" type="button">
                    ⚙️
                </button>

                <div className="font-semibold">
                    Wilson
                </div>

            </div>

        </header>

    );

}