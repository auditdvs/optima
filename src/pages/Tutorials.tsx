import { AnimatePresence, motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useState } from 'react';
import { ThemeSelector } from '../components/ThemeSelector';
import { TutorialCard } from '../components/TutorialCard';
import { ThemeProvider } from '../contexts/ThemeContext';

const guidelines = [
	{
		title: 'Dashboard',
		description: 'Halaman utama yang menampilkan ringkasan statistik dan informasi penting.',
		sections: [
			'Overview statistik audit dan performa',
			'Quick access ke fitur utama',
			'Grafik dan chart data audit',
			'Status progress pekerjaan terkini'
		]
	},
	{
		title: 'Profiles',
		description: 'Pengelolaan profil pengguna dan pengaturan akun personal.',
		sections: [
			'Edit informasi profil pribadi',
			'Rekapitulasi aktivitas audit tahunan/khusus pengguna',
			'Prioritas jadwal audit tahunan',
			'Issue administrasi pengguna'
		]
	},
	{
		title: 'Company Regulations',
		description: 'Kumpulan peraturan dan kebijakan perusahaan yang berlaku.',
		sections: [
			'Peraturan audit internal',
			'Standar operasional prosedur (SOP)',
			'Kebijakan keamanan data',
			'Panduan etika kerja'
		]
	},
	{
		title: 'Tutorials',
		description: 'Kumpulan tutorial dan panduan penggunaan aplikasi.',
		sections: [
			'Tutorial penggunaan fitur THC',
			'Panduan pengolahan data manual',
			'Tutorial setting aplikasi',
			'Guidelines menu dan fungsi sistem'
		]
	},
	{
		title: 'Branch Directory',
		description: 'Direktori lengkap cabang-cabang dan informasi kontak.',
		sections: [
			'Daftar semua cabang KOMIDA',
			'Informasi kontak setiap cabang',
			'Data alamat dan lokasi',
			'Status operasional cabang'
		]
	},
	{
		title: 'Assignment Letter',
		description: 'Pengelolaan surat penugasan audit dan dokumen terkait.',
		sections: [
			'Buat surat penugasan baru',
			'Buat addendum surat penugasan',
			'Track status penugasan',
			'Download dokumen penugasan'
		]
	},
	{
		title: 'Tools',
		description: 'Kumpulan tools dan utilities untuk membantu proses audit.',
		sections: [
			'Tools pengolahan data audit',
			'Utilities analisis anomali',
			'Generator laporan otomatis',
			'Helper functions dan calculator'
		]
	},
	{
		title: 'Grammar Correction',
		description: 'Tools untuk koreksi tata bahasa dan penulisan dokumen.',
		sections: [
			'Fitur ini akan dimatikan karena tidak ada budget untuk langganan API pihak ketiga'
		]
	},
	{
		title: 'Message History',
		description: 'Riwayat pesan dan komunikasi dalam sistem.',
		sections: [
			'Riwayat pesan masuk dan keluar',
			'Notifikasi sistem',
			'Komunikasi dari pengembang kepada pengguna',
			'Archive pesan penting'
		]
	},
	{
		title: 'Database',
		description: 'Menu untuk mengakses dan request data dari berbagai sumber database.',
		sections: [
			'Db Loan and Saving - Data pinjaman dan simpanan',
			'Detail Anggota - Informasi lengkap anggota',
			'Fix Asset - Data aset tetap',
			'THC, TAK, TLP, SERTA KDP',
			'FILE OUTPUT BERUPA CSV, HARAP MELIHAT TUTORIAL JIKA TIDAK TAU CARA TEXT TO COLUMN',
			'Akan ada penambahan menu baru di database sesuai kebutuhan user'
		]
	}
];

const tutorials = [
	{
		title: 'Tutorial THC',
		description: 'Bisa hands on langsung dengan tim dvs, dikarenakan file tutorialnya hilang',
		url: 'https://wa.me/628172320099',
		type: 'link'
	},
	{
		title: 'Tutorial Merapihkan File CSV',
		description: 'Tutorial video cara merapihkan dan mengolah file CSV dengan benar.',
		url: 'https://keamzxefzypvbaxjyacv.supabase.co/storage/v1/object/public/tutorials/tutorials/Merapihkan%20file%20CSV.mp4',
		type: 'video'
	},
	{
		title: 'Tutorial Setting Edge',
		description: 'Cara atur ulang edge untuk membuka MDIS.',
		url: 'https://drive.google.com/file/d/1HRRpcwsrCAD4RTziFmcHm_OMg0Vk_6mp/view?usp=drive_link',
		type: 'gdrive'
	},
	{
		title: 'Tutorial THC Pinjaman',
		description:
			'Pembuatan THC Pinjaman, didalam tools sudah tersedia kriteria yang di gunakan apa saja.',
		url: 'https://drive.google.com/file/d/1WOVOK4rj6g1BhJdDTLOUnXWmxZZeyJjD/view?usp=drive_link',
		type: 'gdrive'
	},
	{
		title: 'Tutorial Analisa Anomali',
		description: 'Penggunaan modul analisa anomali keseluruhan.',
		url: 'https://drive.google.com/file/d/1woc7ECpSd07cxNd264VpACnpQprzsurv/view?usp=drive_link',
		type: 'gdrive'
	},
];

export default function Tutorials() {
	const [showThemeSelector, setShowThemeSelector] = useState(false);
	const [activeTab, setActiveTab] = useState('tutorials');
	const [videoPopup, setVideoPopup] = useState<{ show: boolean; url: string; title: string }>({
		show: false,
		url: '',
		title: ''
	});

	const toggleThemeSelector = () => {
		setShowThemeSelector((prev) => !prev);
	};

	const openVideoPopup = (url: string, title: string) => {
		setVideoPopup({ show: true, url, title });
	};

	const closeVideoPopup = () => {
		setVideoPopup({ show: false, url: '', title: '' });
	};

	return (
		<ThemeProvider>
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1
						className="text-2xl font-bold text-gray-900 cursor-pointer inline-flex items-center"
						onClick={toggleThemeSelector}
					>
						Tutorials
					</h1>
					<p className="text-gray-600">
						Download tutorial documents and guidelines for various features
					</p>
				</div>

				{/* Tab Navigation - Show for all users */}
				<div className="bg-white rounded-lg shadow-md mb-6">
					<div className="flex border-b">
						<button
							className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
								activeTab === 'tutorials'
									? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
									: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
							}`}
							onClick={() => setActiveTab('tutorials')}
						>
							Tutorials
						</button>
						<button
							className={`py-3 px-6 font-medium text-sm flex-1 text-center ${
								activeTab === 'guidelines'
									? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
									: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
							}`}
							onClick={() => setActiveTab('guidelines')}
						>
							Guidelines
						</button>
					</div>
				</div>

				<AnimatePresence>
					{showThemeSelector && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className="overflow-hidden mb-6"
						>
							<ThemeSelector />
						</motion.div>
					)}
				</AnimatePresence>

				{/* Content based on active tab */}
				{activeTab === 'tutorials' && (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{tutorials.map((tutorial, index) => {
							if (tutorial.type === 'video') {
								return (
									<div
										key={index}
										className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
										onClick={() => openVideoPopup(tutorial.url, tutorial.title)}
									>
										<div className="flex items-center justify-between mb-3">
											<h3 className="text-lg font-semibold text-gray-900 flex-1">
												{tutorial.title}
											</h3>
											<Play className="w-6 h-6 text-indigo-600 flex-shrink-0 ml-2" />
										</div>
										<p className="text-gray-600 text-sm mb-4">
											{tutorial.description}
										</p>
										<div className="flex items-center justify-between">
											<span className="text-xs text-indigo-600 font-medium">
												CLICK TO PLAY
											</span>
											<span className="text-xs text-gray-500">
												Video Tutorial
											</span>
										</div>
									</div>
								);
							} else if (tutorial.type === 'gdrive') {
								return (
									<div
										key={index}
										className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
										onClick={() => window.open(tutorial.url, '_blank')}
									>
										<div className="flex items-center justify-between mb-3">
											<h3 className="text-lg font-semibold text-gray-900 flex-1">
												{tutorial.title}
											</h3>
											<svg className="w-6 h-6 text-green-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
											</svg>
										</div>
										<p className="text-gray-600 text-sm mb-4">
											{tutorial.description}
										</p>
										<div className="flex items-center justify-between">
											<span className="text-xs text-green-600 font-medium">
												OPEN GOOGLE DRIVE
											</span>
											<span className="text-xs text-gray-500">
												Video Tutorial
											</span>
										</div>
										<div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
											⚠️ Requires Google Drive access permission
										</div>
									</div>
								);
							} else {
								return (
									<TutorialCard
										key={index}
										title={tutorial.title}
										description={tutorial.description}
										url={tutorial.url}
										buttonText={tutorial.title === 'Tutorial THC' ? 'Hubungi Administrator' : undefined}
										icon={tutorial.title === 'Tutorial THC' ? (
											<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
											</svg>
										) : undefined}
									/>
								);
							}
						})}
					</div>
				)}

				{/* Guidelines Content - Show for all users */}
				{activeTab === 'guidelines' && (
					<div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
						{guidelines.map((guideline, index) => (
							<div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									{guideline.title}
								</h3>
								<p className="text-gray-600 mb-4">
									{guideline.description}
								</p>
								<div className="space-y-2">
									<h4 className="text-sm font-medium text-gray-700 mb-2">Fitur yang tersedia:</h4>
									<ul className="space-y-1">
										{guideline.sections.map((section, sectionIndex) => (
											<li key={sectionIndex} className="flex items-center text-sm text-gray-600">
												<span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 flex-shrink-0"></span>
												{section}
											</li>
										))}
									</ul>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Video Popup Modal */}
			{videoPopup.show && (
				<div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
						<div className="flex items-center justify-between p-4 border-b">
							<h3 className="text-lg font-semibold text-gray-900">
								{videoPopup.title}
							</h3>
							<button
								onClick={closeVideoPopup}
								className="p-2 hover:bg-gray-100 rounded-full transition-colors"
							>
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</div>
						<div className="relative aspect-video">
							<video
								src={videoPopup.url}
								controls
								autoPlay
								className="w-full h-full object-contain"
								onError={(e) => {
									console.error('Video loading error:', e);
									alert('Error loading video. Please try again.');
									closeVideoPopup();
								}}
							>
								Your browser does not support the video tag.
							</video>
						</div>
					</div>
				</div>
			)}
		</ThemeProvider>
	);
}