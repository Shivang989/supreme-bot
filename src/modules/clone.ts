import { TelegramClient, Api } from "telegram";
import { CustomFile } from "telegram/client/uploads";
import { DB } from "../db";

export async function cloneRouter(message: any, client: TelegramClient, userId: string): Promise<void> {
    const text = message.text?.trim() || "";
    const args = text.split(" ");
    const command = args[0].toLowerCase();

    // ──────────────────────────────────────────────
    // 🎭 .clone Command
    // ──────────────────────────────────────────────
    if (command === ".clone") {
        const reply = await message.getReplyMessage();
        if (!reply) {
            await message.edit({ text: "⚠️ **Reply to a user's message to clone their identity.**" }).catch(() => {});
            return;
        }

        const sender: any = await reply.getSender();
        if (!sender || sender.className !== "User") {
            await message.edit({ text: "⚠️ **Cannot clone channels, bots, or non-user entities.**" }).catch(() => {});
            return;
        }

        await message.edit({ text: "🎭 **Cloning identity... Fetching target profile...**" }).catch(() => {});

        try {
            // 1. Fetch Target User Details & Bio
            const targetInput = await client.getInputEntity(sender.id);
            const targetFull: any = await client.invoke(
                new Api.users.GetFullUser({ id: targetInput })
            ).catch(() => null);

            const targetFirstName = sender.firstName || "";
            const targetLastName = sender.lastName || "";
            const targetAbout = targetFull?.fullUser?.about || "";

            // 2. Backup Current Account Identity (Only if not already cloned)
            const existingBackup = await DB.cloneBackups.findOne({ userId });
            if (!existingBackup) {
                const me: any = await client.getMe();
                const myFull: any = await client.invoke(
                    new Api.users.GetFullUser({ id: new Api.InputUserSelf() })
                ).catch(() => null);

                await DB.cloneBackups.insertOne({
                    userId,
                    firstName: me.firstName || "",
                    lastName: me.lastName || "",
                    about: myFull?.fullUser?.about || "",
                    hasClonedPhoto: false,
                    createdAt: new Date()
                });
            }

            // 3. Clone Profile Details (Name & About)
            await client.invoke(
                new Api.account.UpdateProfile({
                    firstName: targetFirstName,
                    lastName: targetLastName,
                    about: targetAbout
                })
            );

            // 4. Download and Apply Target Profile Photo
            let clonedPhotoSuccess = false;
            try {
                const photoBuffer: any = await client.downloadProfilePhoto(sender);
                if (photoBuffer && photoBuffer.length > 0) {
                    const toUpload = await client.uploadFile({
                        file: new CustomFile("pfp.jpg", photoBuffer.length, "", photoBuffer),
                        workers: 1
                    });

                    await client.invoke(
                        new Api.photos.UploadProfilePhoto({
                            file: toUpload
                        })
                    );
                    clonedPhotoSuccess = true;
                }
            } catch (photoErr: any) {
                console.warn("⚠️ [Clone] Profile picture clone failed:", photoErr.message);
            }

            if (clonedPhotoSuccess) {
                await DB.cloneBackups.updateOne(
                    { userId },
                    { $set: { hasClonedPhoto: true } }
                );
            }

            await message.edit({
                text: `🎭 **Identity Cloned Successfully!**\n━━━━━━━━━━━━━━━━━━━━━\n👤 **Name:** \`${targetFirstName} ${targetLastName}\`\n📝 **Bio:** \`${targetAbout || "None"}\`\n🖼️ **Photo:** \`${clonedPhotoSuccess ? "Cloned" : "Not available"}\``
            }).catch(() => {});
        } catch (err: any) {
            console.error("❌ [Clone Error]:", err.message);
            await message.edit({ text: `❌ **Failed to clone profile:** \`${err.message}\`` }).catch(() => {});
        }
        return;
    }

    // ──────────────────────────────────────────────
    // 🔄 .return / .wapis Command
    // ──────────────────────────────────────────────
    if (command === ".return" || command === ".wapis") {
        const backup = await DB.cloneBackups.findOne({ userId });
        if (!backup) {
            await message.edit({ text: "⚠️ **No backup found. You are already in your original identity.**" }).catch(() => {});
            return;
        }

        await message.edit({ text: "🔄 **Restoring original profile & settings...**" }).catch(() => {});

        try {
            // 1. Restore Name & Bio
            await client.invoke(
                new Api.account.UpdateProfile({
                    firstName: backup.firstName,
                    lastName: backup.lastName,
                    about: backup.about
                })
            );

            // 2. Remove Cloned Profile Photo (Restores original previous photo)
            if (backup.hasClonedPhoto) {
                try {
                    const photosRes: any = await client.invoke(
                        new Api.photos.GetUserPhotos({
                            userId: new Api.InputUserSelf(),
                            offset: 0,
                            maxId: BigInt(0) as any,
                            limit: 1
                        })
                    );

                    if (photosRes?.photos?.length > 0) {
                        const topPhoto = photosRes.photos[0];
                        if (topPhoto instanceof Api.Photo) {
                            await client.invoke(
                                new Api.photos.DeletePhotos({
                                    id: [
                                        new Api.InputPhoto({
                                            id: topPhoto.id,
                                            accessHash: topPhoto.accessHash,
                                            fileReference: topPhoto.fileReference
                                        })
                                    ]
                                })
                            );
                        }
                    }
                } catch (photoErr: any) {
                    console.warn("⚠️ [Return] Could not delete cloned photo:", photoErr.message);
                }
            }

            // 3. Clear Backup from Database
            await DB.cloneBackups.deleteOne({ userId });

            await message.edit({
                text: `✅ **Original Identity Restored!**\n━━━━━━━━━━━━━━━━━━━━━\n👤 **Name:** \`${backup.firstName} ${backup.lastName}\`\n📝 **Bio:** \`${backup.about || "None"}\``
            }).catch(() => {});
        } catch (err: any) {
            console.error("❌ [Return Error]:", err.message);
            await message.edit({ text: `❌ **Failed to restore original identity:** \`${err.message}\`` }).catch(() => {});
        }
    }
}
