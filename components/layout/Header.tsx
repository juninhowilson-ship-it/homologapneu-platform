import Logo from "./Logo";

export default function Header() {

    return (

        <header className="h-16 bg-slate-900 flex items-center justify-between px-8 shadow">

            <Logo />

            <div className="flex items-center gap-6 text-white">

                🔔

                ⚙️

                <div className="font-semibold">
                    Wilson
                </div>

            </div>

        </header>

    );

}