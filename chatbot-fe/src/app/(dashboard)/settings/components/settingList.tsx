import { Setting } from "@/app/types/settings"

const SettingList = ({ settings }: { settings: Setting[] }) => {
    return (
        <div className="space-y-4" >
            {
                settings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded" >
                        <div>
                            <h3 className="font-medium text-black" > {setting.key} </h3>
                            < p className="text-sm text-black" > Type: {setting.type} </p>
                        </div>
                    </div>
                ))
            }
        </div>

    )
}
export default SettingList
