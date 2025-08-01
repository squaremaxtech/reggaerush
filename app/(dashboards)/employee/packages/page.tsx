import ViewTable from '@/components/viewTable/ViewTable'
import { packages } from '@/db/schema'
import { getPackages } from '@/serverFunctions/handlePackages'
import { packageType, tableFilterTypes } from '@/types'
import { provideFilterAndColumnForTable } from '@/utility/utility'
import Link from 'next/link'
import React from 'react'

export default async function Page() {
    const seenPackages = await getPackages({}, { crud: "r" }, { fromUser: true })

    return (
        <main className='container'>
            <Link href={`/employee/packages/add`} style={{ justifySelf: "flex-end" }}>
                <button className='button1'>add</button>
            </Link>

            {seenPackages.length > 0 ? (
                <ViewTable
                    wantedItems={seenPackages}
                    tableProvider={provideFilterAndColumnForTable(packages)}
                    sizeClass={{
                        large: ["id", "trackingNumber", "location", "dateCreated"],
                        small: []
                    }}
                    searchFunc={async (activeFilters, wantedItemsSearchObj) => {
                        "use server"
                        return await getPackages(activeFilters as tableFilterTypes<packageType>, { crud: "r" }, { fromUser: true }, wantedItemsSearchObj.limit, wantedItemsSearchObj.offset)
                    }}
                    headingOrder={["id", "dateCreated", "fromUser"]}
                    renameTableHeadings={{
                        id: "reggaeRushTrack"
                    }}
                    replaceData={{
                        id: {
                            link: `/employee/packages/edit`,
                            materialIconClass: "link",
                            transformLink: true,
                        }
                    }}
                />
            ) : (
                <p>customer packages will show here</p>
            )}
        </main>
    )
}