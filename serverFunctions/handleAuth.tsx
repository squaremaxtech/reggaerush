"use server";
import { auth } from "@/auth/auth";
import { getSpecificUser } from "./handleUser";
import { userType } from "@/types";
import * as schema from "@/db/schema"

type schemaType = typeof schema

type crudType = "c" | "r" | "u" | "d" | "co" | "ro" | "uo" | "do";
type userCrudType = {
    admin: crudType[];
    employee_regular: crudType[];
    employee_warehouse: crudType[];
    employee_elevated: crudType[];
    employee_supervisor: crudType[];
    customer: crudType[];
};
type userCrudKeysType = keyof userCrudType;

type tableNames = keyof schemaType
type tableColumns = {
    // used
    users: keyof schemaType["users"]["$inferSelect"];
    packages: keyof schemaType["packages"]["$inferSelect"];
    preAlerts: keyof schemaType["preAlerts"]["$inferSelect"];

    // not used
    accounts: ""
    sessions: ""
    authenticators: ""
    verificationTokens: ""
    roleEnum: ""
    accessLevelEnum: ""
    statusEnum: ""
    locationEnum: ""
    userRelations: ""
    packageRelations: ""
    preAlertRelations: ""
};

const fullAccess: crudType[] = ["c", "r", "u", "d"];
const read: crudType[] = ["r"];
const readOwn: crudType[] = ["ro"];
const readUpdate: crudType[] = ["r", "u"];
const createReadUpdateOwn: crudType[] = ["c", "r", "uo", "do"];
const fixedUserCrud: userCrudType = {
    admin: read,
    employee_regular: read,
    employee_warehouse: read,
    employee_elevated: read,
    employee_supervisor: read,
    customer: read,
}

type tableAccessType = {
    [T in tableNames]: {
        tableCrud: userCrudType;
        columnDefaultCrud: userCrudType;
        columns?: {
            [C in tableColumns[T]]?: userCrudType;
        };
    } | undefined
};

const tableAccess: tableAccessType = {
    users: {
        tableCrud: {
            admin: fullAccess,
            employee_regular: read,
            employee_warehouse: read,
            employee_elevated: read,
            employee_supervisor: ["c", "r"],
            customer: readOwn,
        },
        columnDefaultCrud: {
            admin: fullAccess,
            employee_regular: read,
            employee_warehouse: read,
            employee_elevated: read,
            employee_supervisor: read,
            customer: readOwn,
        },
        columns: {
            id: fixedUserCrud,
            role: {
                admin: readUpdate,
                employee_regular: read,
                employee_warehouse: read,
                employee_elevated: read,
                employee_supervisor: read,
                customer: readOwn,
            },
            accessLevel: {
                admin: readUpdate,
                employee_regular: read,
                employee_warehouse: read,
                employee_elevated: read,
                employee_supervisor: readUpdate,
                customer: readOwn,
            },
            name: {
                admin: fullAccess,
                employee_regular: read,
                employee_warehouse: read,
                employee_elevated: readUpdate,
                employee_supervisor: readUpdate,
                customer: ["r", "uo"],
            },
            authorizedUsers: {
                admin: fullAccess,
                employee_regular: read,
                employee_warehouse: read,
                employee_elevated: fullAccess,
                employee_supervisor: fullAccess,
                customer: ["co", "ro", "uo", "do"],
            },
        },
    },
    packages: {
        tableCrud: {
            admin: fullAccess,
            employee_regular: ["r"],
            employee_warehouse: fullAccess,
            employee_elevated: fullAccess,
            employee_supervisor: fullAccess,
            customer: ["ro"],
        },
        columnDefaultCrud: {
            admin: fullAccess,
            employee_regular: read,
            employee_warehouse: readUpdate,
            employee_elevated: readUpdate,
            employee_supervisor: readUpdate,
            customer: readOwn,
        },
        columns: {
            comments: {
                admin: fullAccess,
                employee_regular: createReadUpdateOwn,
                employee_warehouse: createReadUpdateOwn,
                employee_elevated: createReadUpdateOwn,
                employee_supervisor: fullAccess,
                customer: [],
            },
        },
    },
    preAlerts: {
        tableCrud: {
            admin: fullAccess,
            employee_regular: fullAccess,
            employee_warehouse: read,
            employee_elevated: fullAccess,
            employee_supervisor: fullAccess,
            customer: ["c", "ro", "uo", "do"],
        },
        columnDefaultCrud: {
            admin: fullAccess,
            employee_regular: ["r"],
            employee_warehouse: ["r", "u"],
            employee_elevated: ["r", "u"],
            employee_supervisor: ["r", "u"],
            customer: ["c", "ro", "uo", "do"],
        },
        columns: {
        },
    },




    // not used
    accounts: undefined,
    sessions: undefined,
    authenticators: undefined,
    verificationTokens: undefined,

    roleEnum: undefined,
    accessLevelEnum: undefined,
    statusEnum: undefined,
    locationEnum: undefined,

    userRelations: undefined,
    packageRelations: undefined,
    preAlertRelations: undefined,
};

export async function sessionCheck() {
    const session = await auth();
    if (!session) throw new Error("No session found");
    return session;
}

export async function adminCheck() {
    const session = await sessionCheck();
    if (session.user.role !== "admin") throw new Error("Admin access required");

    return session;
}

export async function employeeOrAdminCheck() {
    const session = await sessionCheck();

    const role = session.user.role;
    if (role !== "admin" && role !== "employee") throw new Error("Must be admin or employee");

    return session;
}

export async function customerCheck() {
    const session = await sessionCheck();

    if (session.user.role !== "customer") throw new Error("Must be a customer");

    return session;
}

type accessType = {
    [key in crudType]: boolean | undefined
}



export async function ensureCanAccessTable<T extends tableNames>(
    tableName: T,
    columnName?: tableColumns[T],
    resourceId?: string
) {
    const access: accessType = {
        c: undefined,
        r: undefined,
        u: undefined,
        d: undefined,
        co: undefined,
        ro: undefined,
        uo: undefined,
        do: undefined,
    }
    const errors: string[] = []

    try {
        const session = await sessionCheck();

        const table = tableAccess[tableName];
        if (table === undefined) throw new Error(`No access rules for table '${tableName}'`);

        const userType = getUserType(session.user);
        let accessList: crudType[] | null = null;

        //column access list
        if (columnName !== undefined) {
            if (table.columns === undefined) throw new Error("not seeing columns on table")

            const column = table.columns[columnName];
            accessList = column === undefined ? table.columnDefaultCrud[userType] : column[userType]

        } else {
            //table access list
            accessList = table.tableCrud[userType];
        }

        //update values
        accessList.forEach(eachCrudSeen => {
            access[eachCrudSeen] = true
        })

        //if access allows crud only - co, ro, uo, do - check for ownership
        if (access["co"] || access["ro"] || access["uo"] || access["do"]) {
            try {
                if (resourceId === undefined) throw new Error("Not seeing resource ID for ownership check");

                let ownershipId = "";

                //owenrship check on users table e.g
                if (tableName === "users") {
                    const resourceUser = await getSpecificUser(resourceId);
                    if (resourceUser === undefined) throw new Error("Resource user user not found");

                    ownershipId = resourceUser.id;

                } else {
                    throw new Error("Ownership check not implemented for this table");
                }

                if (session.user.id !== ownershipId) throw new Error("Not authorized as owner");

            } catch (error) {
                const seenError = error as Error

                //update values to false
                access["co"] = false
                access["ro"] = false
                access["uo"] = false
                access["do"] = false

                //send error up
                throw new Error(seenError.message)
            }
        }

    } catch (error) {
        const seenError = error as Error
        errors.push(seenError.message)
    }

    return {
        access,
        errors: errors.length > 0 ? errors : undefined
    }
}

function getUserType(user: userType): userCrudKeysType {
    return user.role === "employee"
        ? `employee_${user.accessLevel}` as userCrudKeysType
        : user.role;
}