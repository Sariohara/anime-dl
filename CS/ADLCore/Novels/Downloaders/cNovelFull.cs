﻿using ADLCore.Alert;
using ADLCore.Ext;
using ADLCore.Interfaces;
using ADLCore.Novels;
using ADLCore.Novels.Models;
using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;

namespace KobeiD.Downloaders
{
    public class cNovelFull : DownloaderBase
    {
        public cNovelFull(string url, int taskIndex, Action<int, string> act) : base(url, taskIndex, act)
        {

        }

        public override MetaData GetMetaData()
        {
            if (mdata != null)
                return mdata;
            ADLUpdates.CallUpdate("Creating MetaData Object", false);
            pageEnumerator.Reset();

            Dictionary<string, LinkedList<HtmlNode>> baseInfo = pageEnumerator.GetElementsByClassNames(new string[] { "title", "info", "book"});

            mdata = new MetaData();
            this.mdata.url = this.url.ToString();

            mdata.name = baseInfo["title"].First().InnerText;
            string[] sp = baseInfo["info"].First().InnerText.Split(":");
            mdata.author = sp[1].Replace("Genre", string.Empty);
            mdata.type = sp.Last();
            mdata.genre = sp[2];
            mdata.rating = "-1";

            string x = $"http://{url.Host}{Regex.Match(baseInfo["book"].First().OuterHtml, @"<img[^>]+src=""([^"">]+)""").Groups[1].Value}";
            //x = x.Remove(x.IndexOf('?'));
            GenerateHeaders();
            mdata.cover = webClient.DownloadData(x);

            pageEnumerator.Reset();
            baseInfo.Clear();
            ADLUpdates.CallUpdate($"Got MetaData Object for {mdata.name} by {mdata.author}", false);
            return mdata;
        }


        public override Chapter[] GetChapterLinks(bool sort = false)
        {
            int idx = 0;
            List<Chapter> chaps = new List<Chapter>();
            Regex reg = new Regex("href=\"(.*?)\"");
            ADLUpdates.CallUpdate($"Getting Chapter Links for {mdata.name}", false);
            while (true)
            {
                idx++;
                MovePage($"{mdata.url}?page={idx.ToString()}&per-page=50"); // limited to 50
                Dictionary<string, LinkedList<HtmlNode>> chapterInfo = pageEnumerator.GetElementsByClassNames(new string[] { "list-chapter" });

                if (chapterInfo["list-chapter"].Count <= 0)
                    break;

                IEnumerator<HtmlNode> a = chapterInfo["list-chapter"].GetEnumerator();
                while (a.MoveNext())
                {
                    LoadPage(a.Current.InnerHtml);
                    foreach (HtmlNode ele in page.DocumentNode.SelectNodes("//li"))
                    {
                        Chapter ch = new Chapter(this) { name = ele.InnerText.SkipCharSequence(new char[] { ' ' }), chapterLink = new Uri("https://" + url.Host + reg.Match(ele.InnerHtml).Groups[1].Value) };
                        if (chaps.Where(x => x.chapterLink == ch.chapterLink).Count() == 0)
                            chaps.Add(ch);
                        else
                            goto exit;

                    }
                }
            }
            exit:
            ADLUpdates.CallUpdate($"Found {chaps.Count} Chapters for {mdata.name}", false);
            return chaps.ToArray();
        }

        public override string GetText(Chapter chp, HtmlDocument use, WebClient wc)
        {
            wc.Headers = IAppBase.GenerateHeaders(chp.chapterLink.Host);
            string dwnld = wc.DownloadString(chp.chapterLink);
            use.LoadHtml(dwnld);
            HtmlNode a = use.DocumentNode.FindAllNodes().GetFirstElementByClassNameA("chapter-c");
            a.InnerHtml = Regex.Replace(a.InnerHtml, "<script.*?</script>", string.Empty, RegexOptions.Singleline);
            a.InnerHtml = Regex.Replace(a.InnerHtml, "<div.*?</div>", string.Empty, RegexOptions.Singleline);
            a.InnerHtml = a.InnerHtml.Replace("<p>", "\n").Replace("</p>", "\n");
            GC.Collect();
            return a.InnerHtml;
        }
    }
}