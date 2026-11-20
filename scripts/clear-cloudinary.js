// ============================================
// Xalt Moments - Eliminar todos los archivos de Cloudinary
// ============================================
// Este script elimina todos los archivos almacenados en Cloudinary
// en las carpetas del proyecto Xalt Moments.
//
// Uso: node scripts/clear-cloudinary.js
// Requiere: .env.local con CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//
// ⚠️ ADVERTENCIA: Esta operación es IRREVERSIBLE.
//    Todos los archivos se perderán permanentemente.
// ============================================

require('dotenv').config({ path: '.env.local' });
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDERS_TO_CLEAR = [
  'xalt-moments/events',
  'xalt-moments/cover_images',
];

async function listResourcesByFolder(folder) {
  const allResources = [];
  let nextCursor = null;

  console.log(`\n📂 Listando recursos en: ${folder}`);

  do {
    const options = {
      type: 'upload',
      prefix: folder,
      max_results: 500,
      next_cursor: nextCursor,
    };

    const result = await cloudinary.api.resources(options);
    result.resources.forEach(r => allResources.push(r.public_id));
    nextCursor = result.next_cursor;

    console.log(`  Encontrados ${result.resources.length} archivos (total: ${allResources.length})`);
  } while (nextCursor);

  return allResources;
}

async function deleteResource(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { type: 'upload' });
    return result.result !== 'not found';
  } catch (error) {
    console.error(`  ❌ Error eliminando ${publicId}:`, error.message);
    return false;
  }
}

async function deleteResourcesBatch(publicIds, batchSize = 10) {
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < publicIds.length; i += batchSize) {
    const batch = publicIds.slice(i, i + batchSize);
    const promises = batch.map(id => deleteResource(id));
    const results = await Promise.all(promises);

    for (const success of results) {
      if (success) deleted++;
      else failed++;
    }

    console.log(`  Eliminando... ${deleted}/${publicIds.length} (${Math.round(deleted / publicIds.length * 100)}%)`);
  }

  return { deleted, failed };
}

async function main() {
  // Validar credenciales
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Error: Faltan las credenciales de Cloudinary en .env.local');
    console.error('   Necesitas: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  console.log('============================================');
  console.log('  Xalt Moments - Limpiar archivos de Cloudinary');
  console.log('============================================');
  console.log(`Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME}`);

  const confirmation = process.argv[2];
  if (confirmation !== '--yes' && confirmation !== '-y') {
    console.log('\n⚠️  Esta operación eliminará TODOS los archivos de Cloudinary del proyecto.');
    console.log('   Para confirmar, ejecuta: node scripts/clear-cloudinary.js --yes');
    console.log('\nSi estás seguro, ejecuta el comando con la bandera --yes');
    process.exit(0);
  }

  console.log('\n⚠️  Modo de confirmación activado. Procediendo con la eliminación...\n');

  let totalDeleted = 0;
  let totalFailed = 0;

  for (const folder of FOLDERS_TO_CLEAR) {
    try {
      const resources = await listResourcesByFolder(folder);

      if (resources.length === 0) {
        console.log(`  ✅ No hay archivos en ${folder}`);
        continue;
      }

      console.log(`\n🗑️  Eliminando ${resources.length} archivos de ${folder}...`);
      const result = await deleteResourcesBatch(resources);
      totalDeleted += result.deleted;
      totalFailed += result.failed;

      console.log(`  ✅ Completado: ${result.deleted} eliminados, ${result.failed} fallidos`);
    } catch (error) {
      console.error(`  ❌ Error procesando ${folder}:`, error.message);
    }
  }

  console.log('\n============================================');
  console.log('  Resultado final');
  console.log('============================================');
  console.log(`  ✅ Archivos eliminados: ${totalDeleted}`);
  if (totalFailed > 0) {
    console.log(`  ❌ Archivos fallidos: ${totalFailed}`);
  }
  console.log('============================================');

  if (totalDeleted === 0 && totalFailed === 0) {
    console.log('\n✨ No se encontraron archivos para eliminar. Cloudinary ya está limpio.');
  } else {
    console.log('\n✨ Proceso completado.');
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
