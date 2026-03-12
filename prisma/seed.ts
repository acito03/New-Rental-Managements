import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Exact@2016', 12)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'acito03@rental-sys.local' },
    update: {},
    create: {
      name: 'Acito03',
      email: 'acito03@rental-sys.local',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })
  console.log('✅ Super Admin created:', superAdmin.email)

  // Seed some brand types
  const brandTypes = await Promise.all([
    prisma.brandType.upsert({
      where: { brand_type: { brand: 'Sony', type: 'Camera' } },
      update: {},
      create: { brand: 'Sony', type: 'Camera' },
    }),
    prisma.brandType.upsert({
      where: { brand_type: { brand: 'Canon', type: 'Camera' } },
      update: {},
      create: { brand: 'Canon', type: 'Camera' },
    }),
    prisma.brandType.upsert({
      where: { brand_type: { brand: 'DJI', type: 'Drone' } },
      update: {},
      create: { brand: 'DJI', type: 'Drone' },
    }),
    prisma.brandType.upsert({
      where: { brand_type: { brand: 'Rode', type: 'Audio' } },
      update: {},
      create: { brand: 'Rode', type: 'Audio' },
    }),
  ])
  console.log(`✅ Created ${brandTypes.length} brand types`)

  // Seed demo inventory
  const inventory = await Promise.all([
    prisma.inventory.create({
      data: {
        brandTypeId: brandTypes[0].id,
        modelVariant: 'Alpha 7 IV',
        serialNumber: 'SNY-001',
        shortDescription: 'Full-frame mirrorless camera',
        status: 'OK',
      },
    }),
    prisma.inventory.create({
      data: {
        brandTypeId: brandTypes[1].id,
        modelVariant: 'EOS R5',
        serialNumber: 'CNX-001',
        shortDescription: 'Professional mirrorless camera',
        status: 'OK',
      },
    }),
    prisma.inventory.create({
      data: {
        brandTypeId: brandTypes[2].id,
        modelVariant: 'Mavic 3 Pro',
        serialNumber: 'DJI-001',
        shortDescription: 'Professional cinema drone',
        status: 'OK',
      },
    }),
    prisma.inventory.create({
      data: {
        brandTypeId: brandTypes[3].id,
        modelVariant: 'VideoMic Pro+',
        shortDescription: 'Directional shotgun microphone',
        status: 'OK',
      },
    }),
  ])
  console.log(`✅ Created ${inventory.length} inventory items`)

  console.log('\n🎉 Seed complete!')
  console.log('─────────────────────────────────')
  console.log('Super Admin Login:')
  console.log('  Name:     Acito03')
  console.log('  Email:    acito03@rental-sys.local')
  console.log('  Password: Exact@2016')
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
