"use client"
import React from 'react'
import styles from "./style.module.css"
import { usePathname } from 'next/navigation'
import { dashboardMenu } from '@/types'
import DashboardProfile from '../dashboardProfile/DashboardProfile'

export default function Header({ navMenu }: { navMenu: dashboardMenu[] }) {
    const pathname = usePathname()
    const foundNavItem = navMenu.find(eachItem => eachItem.link === pathname)

    return (
        <div className={`${styles.headerCont} textResetMargin`}>
            {foundNavItem !== undefined ? (
                <>
                    <h1>{foundNavItem.title}</h1>

                    {foundNavItem.dashboardHome && (
                        <DashboardProfile />
                    )}
                </>
            ) : (
                <>
                    <h1>Page</h1>
                </>
            )}
        </div>
    )
}